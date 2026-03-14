// Mirror of server/src/types/index.ts — keep in sync

export type RoomStatus = 'lobby' | 'config' | 'playing' | 'finished'
export type RoundStatus = 'composing' | 'guessing' | 'revealed'
export type DescriberMode = 'host' | 'random'

export interface RoomConfig {
  timerDuration: number
  maxEmojis: number
  totalRounds: number
  describerMode: DescriberMode
}

export interface RoomPublicState {
  id: string
  status: RoomStatus
  config: RoomConfig
  players: { pseudo: string; score: number; isHost: boolean; isDescriber: boolean }[]
  currentRoundNumber: number
  totalRounds: number
}

export interface RoundPublicState {
  roundNumber: number
  describerPseudo: string
  status: RoundStatus
  timerDuration: number
  maxEmojis: number
}

export interface GuessResult {
  playerPseudo: string
  isCorrect: boolean
  pointsAwarded: number
  attemptNumber: number
}

export interface RoundReveal {
  movieId: number
  movieTitle: string
  emojiSequence: string[]
  guesses: GuessResult[]
  scores: { pseudo: string; score: number }[]
}

export interface GameSummary {
  scores: { pseudo: string; score: number }[]
  roundHistory: {
    roundNumber: number
    movieTitle: string
    emojiSequence: string[]
    describerPseudo: string
  }[]
}

// Client → Server
export interface ClientToServerEvents {
  'room:create': (pseudo: string, callback: (roomId: string) => void) => void
  'room:join': (roomId: string, pseudo: string, callback: (error: string | null) => void) => void
  'room:update-config': (config: Partial<RoomConfig>, callback: (error: string | null) => void) => void
  'room:start': (callback: (error: string | null) => void) => void
  'round:select-movie': (movieId: number, movieTitle: string, callback: (error: string | null) => void) => void
  'round:submit-emojis': (emojis: string[], callback: (error: string | null) => void) => void
  'round:guess': (movieId: number, movieTitle: string, callback: (result: GuessResult | null, error: string | null) => void) => void
  'round:next': (callback: (error: string | null) => void) => void
  'room:replay': (callback: (error: string | null) => void) => void
}

// Server → Client
export interface ServerToClientEvents {
  'room:updated': (room: RoomPublicState) => void
  'round:started': (round: RoundPublicState) => void
  'round:emojis-revealed': (emojis: string[]) => void
  'round:guess-result': (result: GuessResult) => void
  'round:timer-tick': (remainingMs: number) => void
  'round:revealed': (reveal: RoundReveal) => void
  'game:finished': (summary: GameSummary) => void
  'error': (message: string) => void
}
