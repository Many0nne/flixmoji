'use client'

import { createContext, useContext, useEffect, useReducer, useCallback, ReactNode } from 'react'
import { getSocket, connectSocket } from '@/lib/socket'
import type {
  RoomPublicState,
  RoomConfig,
  RoundPublicState,
  RoundReveal,
  GuessResult,
  GameSummary,
} from '@/types/socket'

// ─── State ────────────────────────────────────────────────────────────────────

interface GameState {
  connected: boolean
  myPseudo: string | null
  room: RoomPublicState | null
  currentRound: RoundPublicState | null
  revealedEmojis: string[] | null   // set when describer submits
  remainingMs: number
  lastReveal: RoundReveal | null    // set at end of each round
  guessResults: GuessResult[]       // live guess feed during a round
  gameSummary: GameSummary | null
  error: string | null
}

const initialState: GameState = {
  connected: false,
  myPseudo: null,
  room: null,
  currentRound: null,
  revealedEmojis: null,
  remainingMs: 0,
  lastReveal: null,
  guessResults: [],
  gameSummary: null,
  error: null,
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'SET_PSEUDO'; pseudo: string }
  | { type: 'ROOM_UPDATED'; room: RoomPublicState }
  | { type: 'ROUND_STARTED'; round: RoundPublicState }
  | { type: 'EMOJIS_REVEALED'; emojis: string[] }
  | { type: 'TIMER_TICK'; remainingMs: number }
  | { type: 'GUESS_RESULT'; result: GuessResult }
  | { type: 'ROUND_REVEALED'; reveal: RoundReveal }
  | { type: 'GAME_FINISHED'; summary: GameSummary }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' }
  | { type: 'REPLAY' }

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, connected: true, error: null }
    case 'DISCONNECTED':
      return { ...state, connected: false }
    case 'SET_PSEUDO':
      return { ...state, myPseudo: action.pseudo }
    case 'ROOM_UPDATED':
      return { ...state, room: action.room, error: null }
    case 'ROUND_STARTED':
      return {
        ...state,
        currentRound: action.round,
        revealedEmojis: null,
        lastReveal: null,
        guessResults: [],
        remainingMs: action.round.timerDuration,
      }
    case 'GUESS_RESULT':
      return { ...state, guessResults: [...state.guessResults, action.result] }
    case 'EMOJIS_REVEALED':
      return {
        ...state,
        revealedEmojis: action.emojis,
        currentRound: state.currentRound
          ? { ...state.currentRound, status: 'guessing' as const }
          : null,
      }
    case 'TIMER_TICK':
      return { ...state, remainingMs: action.remainingMs }
    case 'ROUND_REVEALED':
      return { ...state, lastReveal: action.reveal }
    case 'GAME_FINISHED':
      return { ...state, gameSummary: action.summary, currentRound: null }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'RESET':
      return { ...initialState, connected: state.connected }
    case 'REPLAY':
      return { ...initialState, connected: state.connected, myPseudo: state.myPseudo, room: state.room }
    default:
      return state
  }
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

function deriveMe(state: GameState) {
  if (!state.room || !state.myPseudo) return null
  return state.room.players.find(p => p.pseudo === state.myPseudo) ?? null
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface GameContextValue {
  state: GameState
  isHost: boolean
  isDescriber: boolean
  // Actions
  createRoom: (pseudo: string) => Promise<string>
  joinRoom: (roomId: string, pseudo: string) => Promise<void>
  updateConfig: (config: Partial<RoomConfig>) => Promise<void>
  startGame: () => Promise<void>
  selectMovie: (movieId: number, movieTitle: string) => Promise<void>
  submitEmojis: (emojis: string[]) => Promise<void>
  guess: (movieId: number, movieTitle: string) => Promise<GuessResult>
  nextRound: () => Promise<void>
  replay: () => Promise<void>
  clearError: () => void
  reset: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Connect socket and bind server→client events
  useEffect(() => {
    const socket = getSocket()
    connectSocket()

    socket.on('connect', () => dispatch({ type: 'CONNECTED' }))
    socket.on('disconnect', () => dispatch({ type: 'DISCONNECTED' }))
    socket.on('room:updated', (room) => dispatch({ type: 'ROOM_UPDATED', room }))
    socket.on('round:started', (round) => dispatch({ type: 'ROUND_STARTED', round }))
    socket.on('round:emojis-revealed', (emojis) => dispatch({ type: 'EMOJIS_REVEALED', emojis }))
    socket.on('round:timer-tick', (remainingMs) => dispatch({ type: 'TIMER_TICK', remainingMs }))
    socket.on('round:guess-result', (result) => dispatch({ type: 'GUESS_RESULT', result }))
    socket.on('round:revealed', (reveal) => dispatch({ type: 'ROUND_REVEALED', reveal }))
    socket.on('game:finished', (summary) => dispatch({ type: 'GAME_FINISHED', summary }))
    socket.on('error', (message) => dispatch({ type: 'SET_ERROR', error: message }))

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('room:updated')
      socket.off('round:started')
      socket.off('round:emojis-revealed')
      socket.off('round:timer-tick')
      socket.off('round:guess-result')
      socket.off('round:revealed')
      socket.off('game:finished')
      socket.off('error')
    }
  }, [])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const createRoom = useCallback((pseudo: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      dispatch({ type: 'SET_PSEUDO', pseudo })
      getSocket().emit('room:create', pseudo, (roomId) => {
        if (!roomId) return reject(new Error('Impossible de créer le salon.'))
        resolve(roomId)
      })
    })
  }, [])

  const joinRoom = useCallback((roomId: string, pseudo: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      dispatch({ type: 'SET_PSEUDO', pseudo })
      getSocket().emit('room:join', roomId, pseudo, (error) => {
        if (error) {
          dispatch({ type: 'SET_ERROR', error })
          return reject(new Error(error))
        }
        resolve()
      })
    })
  }, [])

  const updateConfig = useCallback((config: Partial<RoomConfig>): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('room:update-config', config, (error) => {
        if (error) {
          dispatch({ type: 'SET_ERROR', error })
          return reject(new Error(error))
        }
        resolve()
      })
    })
  }, [])

  const startGame = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('room:start', (error) => {
        if (error) {
          dispatch({ type: 'SET_ERROR', error })
          return reject(new Error(error))
        }
        resolve()
      })
    })
  }, [])

  const selectMovie = useCallback((movieId: number, movieTitle: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('round:select-movie', movieId, movieTitle, (error) => {
        if (error) {
          dispatch({ type: 'SET_ERROR', error })
          return reject(new Error(error))
        }
        resolve()
      })
    })
  }, [])

  const submitEmojis = useCallback((emojis: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('round:submit-emojis', emojis, (error) => {
        if (error) {
          dispatch({ type: 'SET_ERROR', error })
          return reject(new Error(error))
        }
        resolve()
      })
    })
  }, [])

  const guess = useCallback((movieId: number, movieTitle: string): Promise<GuessResult> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('round:guess', movieId, movieTitle, (result, error) => {
        if (error || !result) {
          dispatch({ type: 'SET_ERROR', error: error ?? 'Erreur lors de la soumission.' })
          return reject(new Error(error ?? 'Erreur'))
        }
        resolve(result)
      })
    })
  }, [])

  const nextRound = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('round:next', (error) => {
        if (error) {
          dispatch({ type: 'SET_ERROR', error })
          return reject(new Error(error))
        }
        resolve()
      })
    })
  }, [])

  const replay = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('room:replay', (error) => {
        if (error) {
          dispatch({ type: 'SET_ERROR', error })
          return reject(new Error(error))
        }
        dispatch({ type: 'REPLAY' })
        resolve()
      })
    })
  }, [])

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const me = deriveMe(state)
  const isHost = me?.isHost ?? false
  const isDescriber = me?.isDescriber ?? false

  return (
    <GameContext.Provider value={{
      state, isHost, isDescriber,
      createRoom, joinRoom, updateConfig, startGame,
      selectMovie, submitEmojis, guess,
      nextRound, replay, clearError, reset,
    }}>
      {children}
    </GameContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
