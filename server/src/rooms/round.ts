import { Room, Round, RoundReveal, GuessResult } from '../types'

export function startRound(room: Room, roundNumber: number = 1): Round {
  return {
    roundNumber,
    movieId: 0,
    movieTitle: '',
    emojiSequence: [],
    guesses: [],
    timerStartedAt: null,
    timerDuration: room.config.timerDuration * 1000,
    status: 'composing',
  }
}

/**
 * Points for a correct guess — 1000 baseline with a linear time penalty.
 *   → Answered at 0s elapsed  : 1000 pts
 *   → Answered at full timer  : 0 pts
 */
export function computeGuesserPoints(
  elapsedMs: number,
  timerDurationMs: number,
  attemptNumber: number,
): number {
  const remainingRatio = Math.max(0, 1 - elapsedMs / timerDurationMs)
  const penalty = (attemptNumber - 1) * 100
  return Math.max(0, Math.round(1000 * remainingRatio) - penalty)
}

export function buildRoundReveal(room: Room): RoundReveal {
  const round = room.currentRound!

  const guessResults: GuessResult[] = round.guesses.map(g => {
    const player = room.players.find(p => p.socketId === g.playerSocketId)
    return {
      playerPseudo: player?.pseudo ?? '?',
      isCorrect: g.isCorrect,
      pointsAwarded: g.pointsAwarded,
      attemptNumber: g.attemptNumber,
    }
  })

  const scores = room.players
    .map(p => ({ pseudo: p.pseudo, score: p.score }))
    .sort((a, b) => b.score - a.score)

  return {
    movieId: round.movieId,
    movieTitle: round.movieTitle,
    emojiSequence: round.emojiSequence,
    guesses: guessResults,
    scores,
  }
}
