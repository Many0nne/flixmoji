// ─── Enums ────────────────────────────────────────────────────────────────────

export type RoomStatus = 'lobby' | 'config' | 'playing' | 'finished'
export type RoundStatus = 'composing' | 'guessing' | 'revealed'
export type DescriberMode = 'host' | 'random'

// ─── Core entities (in-memory) ────────────────────────────────────────────────

export interface Player {
  socketId: string
  pseudo: string
  score: number
  isHost: boolean
  isDescriber: boolean
}

export interface Guess {
  playerSocketId: string
  movieId: number         // TMDB ID — source of truth for correctness
  movieTitle: string      // display only
  submittedAt: number     // Date.now()
  isCorrect: boolean
  attemptNumber: number
  pointsAwarded: number
}

export interface Round {
  roundNumber: number
  movieId: number         // TMDB ID
  movieTitle: string      // display only, stored at film selection time
  emojiSequence: string[]
  guesses: Guess[]
  timerStartedAt: number | null   // Date.now() when guessing phase starts
  timerDuration: number           // ms
  status: RoundStatus
}

export interface RoomConfig {
  timerDuration: number     // seconds (default: 60)
  maxEmojis: number         // default: 5
  totalRounds: number       // default: 5
  describerMode: DescriberMode
}

export interface Room {
  id: string                // short code (ex: "ABCD")
  hostSocketId: string
  status: RoomStatus
  config: RoomConfig
  players: Player[]
  currentRound: Round | null
  roundHistory: Round[]     // completed rounds (for replay)
  usedDescriberIds: string[]  // rotation tracking
}

// ─── Socket.io events ─────────────────────────────────────────────────────────

// Client → Server
export interface ClientToServerEvents {
  'room:create': (pseudo: string, callback: (roomId: string) => void) => void
  'room:join': (roomId: string, pseudo: string, callback: (error: string | null) => void) => void
  'room:start': (callback: (error: string | null) => void) => void
  'round:select-movie': (movieId: number, movieTitle: string, callback: (error: string | null) => void) => void
  'round:submit-emojis': (emojis: string[], callback: (error: string | null) => void) => void
  'round:guess': (movieId: number, movieTitle: string, callback: (result: GuessResult | null, error: string | null) => void) => void
  'round:next': (callback: (error: string | null) => void) => void  // host only
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

// ─── Public state (broadcast-safe — no secrets) ───────────────────────────────

export interface RoomPublicState {
  id: string
  status: RoomStatus
  config: RoomConfig
  players: Pick<Player, 'pseudo' | 'score' | 'isHost' | 'isDescriber'>[]
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
