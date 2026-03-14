'use client'

import Link from 'next/link'
import { useGame } from '@/context/GameContext'
import DescriberPhase from './DescriberPhase'
import GuesserPhase from './GuesserPhase'
import RevealOverlay from './RevealOverlay'

export default function GameView() {
  const { state, isDescriber } = useGame()
  const { room, currentRound } = state

  if (!room || !currentRound) return null

  return (
    <main className="min-h-screen flex flex-col bg-gray-950 text-white">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="font-black text-lg">🎬</span>
          <span className="text-sm text-gray-400">
            Manche <span className="text-white font-bold">{currentRound.roundNumber}</span>
            <span className="text-gray-600"> / {room.config.totalRounds}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isDescriber ? (
            <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-full font-medium">Décriveur</span>
          ) : (
            <span className="bg-gray-700 text-gray-300 px-2.5 py-1 rounded-full">
              Devineur • {currentRound.describerPseudo} décrit
            </span>
          )}
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
            title="Retour à l'accueil"
          >
            ✕
          </Link>
        </div>
      </header>

      {/* Scores bar */}
      <div className="flex gap-3 overflow-x-auto px-4 py-2 bg-gray-900/50 border-b border-gray-800/50">
        {[...room.players]
          .sort((a, b) => b.score - a.score)
          .map(player => (
            <div
              key={player.pseudo}
              className={`flex items-center gap-1.5 shrink-0 text-xs px-2.5 py-1 rounded-full
                ${player.pseudo === state.myPseudo ? 'bg-indigo-900/60 border border-indigo-700 text-indigo-300' : 'bg-gray-800 text-gray-400'}`}
            >
              {player.isDescriber && <span>🎬</span>}
              <span>{player.pseudo}</span>
              <span className="font-bold text-white">{player.score}</span>
            </div>
          ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-start p-4 pt-6 overflow-y-auto">
        {isDescriber ? <DescriberPhase /> : <GuesserPhase />}
      </div>

      {/* Reveal overlay (end of round) */}
      <RevealOverlay />
    </main>
  )
}
