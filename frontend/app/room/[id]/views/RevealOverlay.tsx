'use client'

import { useGame } from '@/context/GameContext'

export default function RevealOverlay() {
  const { state, isHost, nextRound } = useGame()
  const { lastReveal, room } = state

  if (!lastReveal) return null

  const currentRoundNumber = room?.currentRoundNumber ?? 0
  const totalRounds = room?.config.totalRounds ?? 0
  const isLastRound = currentRoundNumber >= totalRounds

  async function handleNext() {
    await nextRound().catch(() => {})
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-3xl p-6 w-full max-w-md flex flex-col gap-5">

        {/* Film reveal */}
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Le film était…</p>
          <p className="text-2xl font-black">{lastReveal.movieTitle}</p>
        </div>

        {/* Emoji sequence */}
        <div className="flex justify-center flex-wrap gap-2 text-4xl bg-gray-800 rounded-2xl p-4">
          {lastReveal.emojiSequence.map((e, i) => <span key={i}>{e}</span>)}
        </div>

        {/* Guesses recap */}
        {lastReveal.guesses.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500 uppercase tracking-widest">Résultats de la manche</p>
            <ul className="flex flex-col gap-1.5">
              {lastReveal.guesses.filter(g => g.isCorrect).map((g, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>✅</span>
                    <span className="text-green-400 font-medium">{g.playerPseudo}</span>
                    {g.attemptNumber > 1 && (
                      <span className="text-xs text-gray-500">({g.attemptNumber} essais)</span>
                    )}
                  </span>
                  <span className="text-green-400 text-sm">+{g.pointsAwarded} pts</span>
                </li>
              ))}
              {lastReveal.guesses.filter(g => g.isCorrect).length === 0 && (
                <p className="text-gray-500 text-sm text-center">Personne n'a trouvé 😅</p>
              )}
            </ul>
          </div>
        )}

        {/* Scores */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Classement</p>
          <ul className="flex flex-col gap-1.5">
            {lastReveal.scores.map((s, i) => (
              <li key={s.pseudo} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-center text-gray-500 font-mono">{i + 1}</span>
                <span className={s.pseudo === state.myPseudo ? 'font-bold text-indigo-400' : 'text-gray-300'}>
                  {s.pseudo}
                </span>
                <span className="ml-auto font-bold">{s.score} pts</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action */}
        {isHost ? (
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold transition-colors"
          >
            {isLastRound ? '🏆 Voir le classement final' : '➡️ Manche suivante'}
          </button>
        ) : (
          <p className="text-center text-gray-500 text-sm">
            En attente que l'hôte passe à la suite…
          </p>
        )}
      </div>
    </div>
  )
}
