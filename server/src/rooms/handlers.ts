import { Server, Socket } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents, Room, Player, Round } from '../types'
import { createRoom, getRoomBySocketId, toPublicState, pickNextDescriber, buildGameSummary } from './room'
import { startRound, computePoints, buildRoundReveal } from './round'

type IO = Server<ClientToServerEvents, ServerToClientEvents>
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>

export function registerRoomHandlers(io: IO, socket: Sock, rooms: Map<string, Room>) {

  // ─── Create room ────────────────────────────────────────────────────────────
  socket.on('room:create', (pseudo, callback) => {
    const room = createRoom(socket.id, pseudo)
    rooms.set(room.id, room)
    socket.join(room.id)
    console.log(`[room:create] ${room.id} by ${pseudo}`)
    callback(room.id)
    io.to(room.id).emit('room:updated', toPublicState(room))
  })

  // ─── Join room ──────────────────────────────────────────────────────────────
  socket.on('room:join', (roomId, pseudo, callback) => {
    const room = rooms.get(roomId.toUpperCase())
    if (!room) return callback('Salon introuvable.')
    if (room.status === 'finished') return callback('Cette partie est terminée.')

    const player: Player = { socketId: socket.id, pseudo, score: 0, isHost: false, isDescriber: false }

    if (room.status === 'playing') {
      // Queue: mark as joined but wait for next round
      room.players.push(player)
      socket.join(roomId)
      socket.emit('room:updated', toPublicState(room))
      return callback(null)
    }

    room.players.push(player)
    socket.join(roomId)
    console.log(`[room:join] ${pseudo} joined ${roomId}`)
    callback(null)
    io.to(roomId).emit('room:updated', toPublicState(room))
  })

  // ─── Start game (host only) ──────────────────────────────────────────────────
  socket.on('room:start', (callback) => {
    const room = getRoomBySocketId(rooms, socket.id)
    if (!room) return callback('Salon introuvable.')
    if (room.hostSocketId !== socket.id) return callback('Seul l\'hôte peut démarrer la partie.')
    if (room.players.length < 2) return callback('Il faut au moins 2 joueurs.')
    if (room.status !== 'lobby' && room.status !== 'config') return callback('La partie a déjà commencé.')

    room.status = 'playing'
    pickNextDescriber(room)
    const round = startRound(room)
    room.currentRound = round

    console.log(`[room:start] ${room.id} — round 1`)
    io.to(room.id).emit('room:updated', toPublicState(room))

    // Send the secret film info only to the describer
    const describer = room.players.find(p => p.isDescriber)
    if (describer) {
      io.to(describer.socketId).emit('round:started', {
        roundNumber: round.roundNumber,
        describerPseudo: describer.pseudo,
        status: round.status,
        timerDuration: round.timerDuration,
        maxEmojis: room.config.maxEmojis,
      })
    }
    // Everyone else gets a redacted round state
    socket.to(room.id).emit('round:started', {
      roundNumber: round.roundNumber,
      describerPseudo: describer?.pseudo ?? '',
      status: round.status,
      timerDuration: round.timerDuration,
      maxEmojis: room.config.maxEmojis,
    })
    callback(null)
  })

  // ─── Describer selects a movie ───────────────────────────────────────────────
  socket.on('round:select-movie', (movieId, movieTitle, callback) => {
    const room = getRoomBySocketId(rooms, socket.id)
    if (!room || !room.currentRound) return callback('Aucune manche en cours.')
    const player = room.players.find(p => p.socketId === socket.id)
    if (!player?.isDescriber) return callback('Tu n\'es pas le décriveur.')

    room.currentRound.movieId = movieId
    room.currentRound.movieTitle = movieTitle
    console.log(`[round:select-movie] ${movieTitle} (${movieId}) in ${room.id}`)
    callback(null)
  })

  // ─── Describer submits emojis ────────────────────────────────────────────────
  socket.on('round:submit-emojis', (emojis, callback) => {
    const room = getRoomBySocketId(rooms, socket.id)
    if (!room || !room.currentRound) return callback('Aucune manche en cours.')
    const player = room.players.find(p => p.socketId === socket.id)
    if (!player?.isDescriber) return callback('Tu n\'es pas le décriveur.')
    if (!room.currentRound.movieId) return callback('Sélectionne d\'abord un film.')
    if (emojis.length === 0 || emojis.length > room.config.maxEmojis) {
      return callback(`Entre entre 1 et ${room.config.maxEmojis} emojis.`)
    }

    room.currentRound.emojiSequence = emojis
    room.currentRound.status = 'guessing'
    room.currentRound.timerStartedAt = Date.now()

    console.log(`[round:submit-emojis] ${emojis.join('')} in ${room.id}`)
    io.to(room.id).emit('round:emojis-revealed', emojis)

    // Server-side timer
    const timerDuration = room.currentRound.timerDuration
    const interval = setInterval(() => {
      const r = room.currentRound
      if (!r || r.status !== 'guessing') { clearInterval(interval); return }
      const elapsed = Date.now() - (r.timerStartedAt ?? Date.now())
      const remaining = Math.max(0, timerDuration - elapsed)
      io.to(room.id).emit('round:timer-tick', remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        revealRound(io, room, rooms)
      }
    }, 1000)

    callback(null)
  })

  // ─── Guesser submits a guess ─────────────────────────────────────────────────
  socket.on('round:guess', (movieId, movieTitle, callback) => {
    const room = getRoomBySocketId(rooms, socket.id)
    if (!room || !room.currentRound) return callback(null, 'Aucune manche en cours.')
    if (room.currentRound.status !== 'guessing') return callback(null, 'La phase de devinette n\'est pas active.')

    const player = room.players.find(p => p.socketId === socket.id)
    if (!player) return callback(null, 'Joueur introuvable.')
    if (player.isDescriber) return callback(null, 'Le décriveur ne peut pas deviner.')

    const round = room.currentRound
    const playerGuesses = round.guesses.filter(g => g.playerSocketId === socket.id)
    const attemptNumber = playerGuesses.length + 1
    const isCorrect = movieId === round.movieId

    const timerStartedAt = round.timerStartedAt ?? Date.now()
    const elapsed = Date.now() - timerStartedAt
    const points = isCorrect ? computePoints(elapsed, round.timerDuration, attemptNumber) : 0

    const guess = {
      playerSocketId: socket.id,
      movieId,
      movieTitle,
      submittedAt: Date.now(),
      isCorrect,
      attemptNumber,
      pointsAwarded: points,
    }
    round.guesses.push(guess)

    if (isCorrect) {
      player.score += points
    }

    const result = { playerPseudo: player.pseudo, isCorrect, pointsAwarded: points, attemptNumber }
    io.to(room.id).emit('round:guess-result', result)

    // Update describer on correct count
    const correctCount = round.guesses.filter(g => g.isCorrect).length
    const describer = room.players.find(p => p.isDescriber)
    if (describer) {
      // We reuse room:updated to update scores in real time
      io.to(room.id).emit('room:updated', toPublicState(room))
    }

    console.log(`[round:guess] ${player.pseudo} guessed ${movieTitle} — correct: ${isCorrect}`)
    callback(result, null)
  })

  // ─── Host advances to next round ─────────────────────────────────────────────
  socket.on('round:next', (callback) => {
    const room = getRoomBySocketId(rooms, socket.id)
    if (!room) return callback('Salon introuvable.')
    if (room.hostSocketId !== socket.id) return callback('Seul l\'hôte peut passer à la manche suivante.')
    if (!room.currentRound || room.currentRound.status !== 'revealed') {
      return callback('La manche n\'est pas encore terminée.')
    }
    advanceRound(io, room, rooms)
    callback(null)
  })

  // ─── Disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const room = getRoomBySocketId(rooms, socket.id)
    if (!room) return

    const wasDescriber = room.players.find(p => p.socketId === socket.id)?.isDescriber
    const wasHost = room.hostSocketId === socket.id

    // Remove player
    room.players = room.players.filter(p => p.socketId !== socket.id)

    if (room.players.length === 0) {
      rooms.delete(room.id)
      return
    }

    // Transfer host if needed
    if (wasHost) {
      room.players[0].isHost = true
      room.hostSocketId = room.players[0].socketId
      console.log(`[disconnect] Host transferred to ${room.players[0].pseudo} in ${room.id}`)
    }

    io.to(room.id).emit('room:updated', toPublicState(room))
  })
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function revealRound(io: IO, room: Room, rooms: Map<string, Room>) {
  if (!room.currentRound) return
  const round = room.currentRound
  round.status = 'revealed'

  // Award points to describer if at least one correct guess
  const describer = room.players.find(p => p.isDescriber)
  const anyCorrect = round.guesses.some(g => g.isCorrect)
  if (describer && anyCorrect) {
    const baseDescriberPoints = 100
    describer.score += baseDescriberPoints
  }

  const reveal = buildRoundReveal(room)
  io.to(room.id).emit('round:revealed', reveal)
  room.roundHistory.push(round)
}

function advanceRound(io: IO, room: Room, rooms: Map<string, Room>) {
  const nextRoundNumber = (room.currentRound?.roundNumber ?? 0) + 1

  if (nextRoundNumber > room.config.totalRounds) {
    // Game over
    room.status = 'finished'
    room.currentRound = null
    const summary = buildGameSummary(room)
    io.to(room.id).emit('game:finished', summary)
    console.log(`[game:finished] ${room.id}`)
    return
  }

  pickNextDescriber(room)
  const round = startRound(room, nextRoundNumber)
  room.currentRound = round

  const describer = room.players.find(p => p.isDescriber)
  io.to(room.id).emit('room:updated', toPublicState(room))
  io.to(room.id).emit('round:started', {
    roundNumber: round.roundNumber,
    describerPseudo: describer?.pseudo ?? '',
    status: round.status,
    timerDuration: round.timerDuration,
    maxEmojis: room.config.maxEmojis,
  })
  console.log(`[round:start] Round ${nextRoundNumber} in ${room.id}`)
}
