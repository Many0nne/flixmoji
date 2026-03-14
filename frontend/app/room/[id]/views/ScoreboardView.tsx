'use client'

import { useState } from 'react'
import { useGame } from '@/context/GameContext'

const MEDALS = ['🥇', '🥈', '🥉']

export default function ScoreboardView() {
  const { state, isHost, replay } = useGame()
  const { gameSummary, myPseudo } = state
  const [restarting, setRestarting] = useState(false)
  const [activeRound, setActiveRound] = useState<number | null>(null)

  if (!gameSummary) return null

  const winner = gameSummary.scores[0]

  async function handleReplay() {
    setRestarting(true)
    try {
      await replay()
    } catch {
      setRestarting(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gray-950 text-white pb-10">

      {/* Header */}
      <div className="w-full bg-gray-900 border-b border-gray-800 py-6 px-4 text-center">
        <p className="text-4xl mb-2">🏆</p>
        <h1 className="text-2xl font-black">Partie terminée !</h1>
        {winner && (
          <p className="text-gray-400 mt-1 text-sm">
            Victoire de <span className="text-yellow-400 font-bold">{winner.pseudo}</span> avec {winner.score} pts
          </p>
        )}
      </div>

      <div className="w-full max-w-md flex flex-col gap-4 p-4 pt-6">

        {/* Final rankings */}
        <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Classement final</p>
          <ul className="flex flex-col gap-2">
            {gameSummary.scores.map((player, i) => (
              <li
                key={player.pseudo}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl
                  ${player.pseudo === myPseudo ? 'bg-indigo-900/40 border border-indigo-700' : 'bg-gray-800/50'}`}
              >
                <span className="text-xl w-7 text-center">
                  {MEDALS[i] ?? <span className="text-gray-500 font-mono text-sm">{i + 1}</span>}
                </span>
                <span className={`font-medium flex-1 ${player.pseudo === myPseudo ? 'text-indigo-300' : ''}`}>
                  {player.pseudo}
                  {player.pseudo === myPseudo && <span className="text-gray-500 text-xs ml-1">(toi)</span>}
                </span>
                <span className="font-black text-lg">{player.score}</span>
                <span className="text-gray-500 text-xs">pts</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Round history — emoji replay */}
        <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Replay des manches</p>
          <ul className="flex flex-col gap-2">
            {gameSummary.roundHistory.map((round) => (
              <li key={round.roundNumber}>
                <button
                  onClick={() => setActiveRound(activeRound === round.roundNumber ? null : round.roundNumber)}
                  className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <span className="text-xs text-gray-500 font-mono w-5">{round.roundNumber}</span>
                  <span className="flex gap-1 text-xl flex-wrap">
                    {round.emojiSequence.map((e, i) => <span key={i}>{e}</span>)}
                  </span>
                  <span className="ml-auto text-gray-600 text-sm">{activeRound === round.roundNumber ? '▲' : '▼'}</span>
                </button>
                {activeRound === round.roundNumber && (
                  <div className="mt-1 px-3 py-2 bg-gray-800/50 rounded-xl text-sm flex flex-col gap-1">
                    <p className="font-bold">{round.movieTitle}</p>
                    <p className="text-gray-500 text-xs">Décrit par {round.describerPseudo}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        {isHost ? (
          <button
            onClick={handleReplay}
            disabled={restarting}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold text-lg transition-colors"
          >
            {restarting ? 'Redémarrage…' : '🔄 Rejouer'}
          </button>
        ) : (
          <p className="text-center text-gray-500 text-sm">En attente que l'hôte relance une partie…</p>
        )}
      </div>
    </main>
  )
}
