'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useGame } from '@/context/GameContext'
import LobbyView from './views/LobbyView'
import GameView from './views/GameView'
import ScoreboardView from './views/ScoreboardView'

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { state, joinRoom } = useGame()

  // Direct-link join: user has no room state yet
  const [directJoinPseudo, setDirectJoinPseudo] = useState('')
  const [directJoinLoading, setDirectJoinLoading] = useState(false)
  const [directJoinError, setDirectJoinError] = useState<string | null>(null)

  // If already in the right room, nothing to do
  const isInRoom = state.room?.id === id

  async function handleDirectJoin() {
    if (!directJoinPseudo.trim()) return setDirectJoinError('Entre un pseudo.')
    setDirectJoinError(null)
    setDirectJoinLoading(true)
    try {
      await joinRoom(id, directJoinPseudo.trim())
    } catch (e: unknown) {
      setDirectJoinError(e instanceof Error ? e.message : 'Salon introuvable.')
      setDirectJoinLoading(false)
    }
  }

  // Direct-link join screen
  if (!isInRoom && state.connected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gray-950 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-black">🎬 Flixmoji</h1>
          <p className="mt-2 text-gray-400">Tu as été invité à rejoindre le salon <span className="font-mono font-bold text-indigo-400">{id}</span></p>
        </div>
        <div className="w-full max-w-xs bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-400">Ton pseudo</span>
            <input
              className="bg-gray-800 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ex: Cinéphile42"
              value={directJoinPseudo}
              onChange={e => setDirectJoinPseudo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDirectJoin()}
              maxLength={20}
              autoFocus
            />
          </label>
          <button
            onClick={handleDirectJoin}
            disabled={directJoinLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold transition-colors"
          >
            {directJoinLoading ? 'Connexion…' : 'Rejoindre'}
          </button>
          {directJoinError && <p className="text-red-400 text-sm text-center">{directJoinError}</p>}
          <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-300 text-sm text-center transition-colors">
            ← Retour à l'accueil
          </button>
        </div>
      </main>
    )
  }

  // Waiting for socket connection or room data
  if (!isInRoom || !state.room) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-500 animate-pulse">Connexion au salon…</p>
      </main>
    )
  }

  // Route to the right view based on room status
  switch (state.room.status) {
    case 'lobby':
      return <LobbyView />
    case 'playing':
      return <GameView />
    case 'finished':
      return <ScoreboardView />
    default:
      return null
  }
}
