'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGame } from '@/context/GameContext'

type Mode = 'home' | 'create' | 'join'

export default function HomePage() {
  const router = useRouter()
  const { state, createRoom, joinRoom } = useGame()

  const [mode, setMode] = useState<Mode>('home')
  const [pseudo, setPseudo] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function back() { setMode('home'); setError(null) }

  async function handleCreate() {
    if (!pseudo.trim()) return setError('Entre un pseudo.')
    setError(null)
    setLoading(true)
    try {
      const roomId = await createRoom(pseudo.trim())
      router.push(`/room/${roomId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création.')
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!pseudo.trim()) return setError('Entre un pseudo.')
    if (!roomCode.trim()) return setError('Entre un code de salon.')
    setError(null)
    setLoading(true)
    try {
      const code = roomCode.trim().toUpperCase()
      await joinRoom(code, pseudo.trim())
      router.push(`/room/${code}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Salon introuvable.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 bg-gray-950 text-white">

      {/* Logo */}
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-tight">🎬 Flixmoji</h1>
        <p className="mt-2 text-gray-400 text-lg">Fais deviner un film avec des emojis</p>
      </div>

      {/* Connection indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className={`w-2 h-2 rounded-full ${state.connected ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
        <span className="text-gray-500">{state.connected ? 'Connecté' : 'Connexion…'}</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">

        {mode === 'home' && (
          <>
            <button
              onClick={() => setMode('create')}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-lg transition-colors"
            >
              Créer un salon
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold text-lg transition-colors"
            >
              Rejoindre un salon
            </button>
          </>
        )}

        {mode === 'create' && (
          <>
            <button onClick={back} className="text-gray-500 hover:text-gray-300 text-sm text-left transition-colors">
              ← Retour
            </button>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-400">Ton pseudo</span>
              <input
                className="bg-gray-800 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ex: Cinéphile42"
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                maxLength={20}
                autoFocus
              />
            </label>
            <button
              onClick={handleCreate}
              disabled={loading || !state.connected}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold transition-colors"
            >
              {loading ? 'Création…' : 'Créer la partie'}
            </button>
          </>
        )}

        {mode === 'join' && (
          <>
            <button onClick={back} className="text-gray-500 hover:text-gray-300 text-sm text-left transition-colors">
              ← Retour
            </button>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-400">Ton pseudo</span>
              <input
                className="bg-gray-800 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ex: Cinéphile42"
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-400">Code du salon</span>
              <input
                className="bg-gray-800 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest font-mono text-xl text-center"
                placeholder="ABCD"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={4}
              />
            </label>
            <button
              onClick={handleJoin}
              disabled={loading || !state.connected}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold transition-colors"
            >
              {loading ? 'Connexion…' : 'Rejoindre'}
            </button>
          </>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </main>
  )
}
