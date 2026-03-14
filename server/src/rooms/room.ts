import { v4 as uuidv4 } from 'uuid'
import { Room, Player, RoomPublicState, GameSummary } from '../types'

const DEFAULT_CONFIG = {
  timerDuration: 60,  // seconds
  maxEmojis: 5,
  totalRounds: 5,
  describerMode: 'random' as const,
}

/** Generate a short 4-char uppercase room code */
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

export function createRoom(hostSocketId: string, pseudo: string): Room {
  const host: Player = {
    socketId: hostSocketId,
    pseudo,
    score: 0,
    isHost: true,
    isDescriber: false,
  }

  return {
    id: generateRoomId(),
    hostSocketId,
    status: 'lobby',
    config: { ...DEFAULT_CONFIG },
    players: [host],
    currentRound: null,
    roundHistory: [],
    usedDescriberIds: [],
  }
}

export function getRoomBySocketId(rooms: Map<string, Room>, socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.socketId === socketId)) return room
  }
  return undefined
}

export function pickNextDescriber(room: Room): void {
  // Reset all describer flags
  room.players.forEach(p => { p.isDescriber = false })

  if (room.config.describerMode === 'host') {
    const host = room.players.find(p => p.isHost)
    if (host) host.isDescriber = true
    return
  }

  // Random rotation — avoid repeating until everyone has gone
  const eligible = room.players.filter(p => !room.usedDescriberIds.includes(p.socketId))
  const pool = eligible.length > 0 ? eligible : room.players

  if (eligible.length === 0) room.usedDescriberIds = []

  const chosen = pool[Math.floor(Math.random() * pool.length)]
  chosen.isDescriber = true
  room.usedDescriberIds.push(chosen.socketId)
}

export function toPublicState(room: Room): RoomPublicState {
  return {
    id: room.id,
    status: room.status,
    config: room.config,
    players: room.players.map(p => ({
      pseudo: p.pseudo,
      score: p.score,
      isHost: p.isHost,
      isDescriber: p.isDescriber,
    })),
    currentRoundNumber: room.currentRound?.roundNumber ?? 0,
    totalRounds: room.config.totalRounds,
  }
}

export function buildGameSummary(room: Room): GameSummary {
  const scores = room.players
    .map(p => ({ pseudo: p.pseudo, score: p.score }))
    .sort((a, b) => b.score - a.score)

  const roundHistory = room.roundHistory.map(r => {
    const describerPlayer = room.players.find(
      p => r.guesses.every(g => g.playerSocketId !== p.socketId) || p.isDescriber
    )
    return {
      roundNumber: r.roundNumber,
      movieTitle: r.movieTitle,
      emojiSequence: r.emojiSequence,
      describerPseudo: describerPlayer?.pseudo ?? '?',
    }
  })

  return { scores, roundHistory }
}
