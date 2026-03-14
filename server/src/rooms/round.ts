import { Room, Round, RoundReveal, GuessResult } from '../types'

export function startRound(room: Room, roundNumber: number = 1): Round {
  return {
    roundNumber,
    movieId: 0,        // set later by describer via round:select-movie
    movieTitle: '',    // set later
    emojiSequence: [],
    guesses: [],
    timerStartedAt: null,
    timerDuration: room.config.timerDuration * 1000, // store in ms
    status: 'composing',
  }
}

/**
 * Compute points for a correct guess.
 * Base: 1000 pts. Speed bonus: decays linearly over the timer duration.
 * Penalty: -200 pts per wrong attempt before the correct one.
 */
export function computePoints(
  elapsedMs: number,
  timerDurationMs: number,
  attemptNumber: number
): number {
  const BASE = 1000
  const MAX_SPEED_BONUS = 500
  const WRONG_ATTEMPT_PENALTY = 200

  const ratio = Math.max(0, 1 - elapsedMs / timerDurationMs)
  const speedBonus = Math.round(MAX_SPEED_BONUS * ratio)
  const penalty = (attemptNumber - 1) * WRONG_ATTEMPT_PENALTY

  return Math.max(0, BASE + speedBonus - penalty)
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
