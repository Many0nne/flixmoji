'use client'

import { useState, useEffect } from 'react'
import { useGame } from '@/context/GameContext'
import { useTmdbSearch } from '@/hooks/useTmdbSearch'
import { posterUrl, TmdbMovie } from '@/lib/tmdb'
import Timer from './components/Timer'
import type { GuessResult } from '@/types/socket'

export default function GuesserPhase() {
  const { state, guess } = useGame()
  const { currentRound, revealedEmojis, remainingMs, guessResults, room } = state
  const timerDuration = (room?.config.timerDuration ?? 60) * 1000

  const { query, setQuery, results, loading, clear } = useTmdbSearch()
  const [myGuesses, setMyGuesses] = useState<GuessResult[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<GuessResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset all local state on each new round
  useEffect(() => {
    setMyGuesses([])
    setSubmitting(false)
    setLastResult(null)
    setError(null)
    clear()
  }, [currentRound?.roundNumber])

  const isComposing = currentRound?.status === 'composing'
  const myPseudo = state.myPseudo

  const hasFoundIt = myGuesses.some(g => g.isCorrect)

  async function handleGuess(movie: TmdbMovie) {
    if (hasFoundIt || submitting) return
    clear()
    setError(null)
    setSubmitting(true)
    try {
      const result = await guess(movie.id, movie.title)
      setMyGuesses(prev => [...prev, result])
      setLastResult(result)
      setTimeout(() => setLastResult(null), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Waiting for describer ───────────────────────────────────────────────────

  if (isComposing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-5xl animate-bounce">🎬</div>
        <p className="text-gray-400 text-center">
          <span className="font-bold text-white">{currentRound?.describerPseudo}</span> compose sa séquence d'emojis…
        </p>
      </div>
    )
  }

  // ─── Guessing phase ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">

      {/* Timer + emoji sequence */}
      <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4 items-center">
        <Timer remainingMs={remainingMs} totalMs={timerDuration} />
        {revealedEmojis && revealedEmojis.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2 text-5xl">
            {revealedEmojis.map((e, i) => <span key={i}>{e}</span>)}
          </div>
        ) : (
          <p className="text-gray-500 text-sm animate-pulse">Les emojis arrivent…</p>
        )}
      </div>

      {/* Found it! */}
      {hasFoundIt && (
        <div className="bg-green-900/40 border border-green-600 rounded-2xl p-4 text-center">
          <p className="text-green-400 font-bold text-lg">🎉 Bravo, tu as trouvé !</p>
          <p className="text-gray-400 text-sm mt-1">Attends la fin du timer pour voir les résultats.</p>
        </div>
      )}

      {/* Guess feedback */}
      {lastResult && !lastResult.isCorrect && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-center text-sm text-red-400 animate-pulse">
          ❌ Mauvaise réponse — réessaie !
        </div>
      )}

      {/* Guess input — disabled if already found */}
      {!hasFoundIt && (
        <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Ta réponse</p>
          <input
            className="bg-gray-800 rounded-lg px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="Chercher un film…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={submitting}
          />
          {loading && <p className="text-xs text-gray-500 animate-pulse">Recherche…</p>}
          {results.length > 0 && (
            <ul className="flex flex-col gap-1 max-h-52 overflow-y-auto">
              {results.map(movie => (
                <li key={movie.id}>
                  <button
                    onClick={() => handleGuess(movie)}
                    disabled={submitting}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-left transition-colors"
                  >
                    {posterUrl(movie.poster_path) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={posterUrl(movie.poster_path)!} alt="" className="w-8 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-8 h-12 bg-gray-700 rounded" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{movie.title}</p>
                      <p className="text-xs text-gray-500">{movie.release_date?.slice(0, 4)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        </div>
      )}

      {/* Live guess feed */}
      {guessResults.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Réponses</p>
          <ul className="flex flex-col gap-1.5">
            {guessResults.map((g, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span>{g.isCorrect ? '✅' : '❌'}</span>
                <span className={g.playerPseudo === myPseudo ? 'font-bold text-indigo-400' : 'text-gray-300'}>
                  {g.playerPseudo}
                </span>
                {g.isCorrect && (
                  <span className="ml-auto text-green-400 text-xs">+{g.pointsAwarded} pts</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
