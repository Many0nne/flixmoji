'use client'

import { useState } from 'react'
import { useGame } from '@/context/GameContext'
import type { RoomConfig } from '@/types/socket'

export default function LobbyView() {
  const { state, isHost, updateConfig, startGame } = useGame()
  const { room } = state
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!room) return null

  const canStart = room.players.length >= 2

  async function handleStart() {
    setError(null)
    setStarting(true)
    try {
      await startGame()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur.')
      setStarting(false)
    }
  }

  function handleConfig<K extends keyof RoomConfig>(key: K, value: RoomConfig[K]) {
    updateConfig({ [key]: value })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gray-950 text-white">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-black">🎬 Flixmoji</h1>
        <p className="text-gray-500 text-sm mt-1">Salon en attente</p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-4">

        {/* Room code */}
        <div className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Code du salon</p>
            <p className="text-4xl font-black font-mono tracking-widest text-indigo-400">{room.id}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(room.id)}
            className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            Copier
          </button>
        </div>

        {/* Players */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            Joueurs ({room.players.length})
          </p>
          <ul className="flex flex-col gap-2">
            {room.players.map((player) => (
              <li key={player.pseudo} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold">
                  {player.pseudo[0].toUpperCase()}
                </span>
                <span className="font-medium">{player.pseudo}</span>
                {player.isHost && (
                  <span className="ml-auto text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                    Hôte
                  </span>
                )}
                {player.pseudo === state.myPseudo && !player.isHost && (
                  <span className="ml-auto text-xs text-gray-500">(toi)</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Config — host only */}
        {isHost && (
          <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest">Configuration</p>

            <ConfigRow label="Durée du timer">
              <Select
                value={room.config.timerDuration}
                onChange={v => handleConfig('timerDuration', v)}
                options={[
                  { label: '30 s', value: 30 },
                  { label: '60 s', value: 60 },
                  { label: '90 s', value: 90 },
                  { label: '2 min', value: 120 },
                ]}
              />
            </ConfigRow>

            <ConfigRow label="Emojis max">
              <Select
                value={room.config.maxEmojis}
                onChange={v => handleConfig('maxEmojis', v)}
                options={[
                  { label: '3', value: 3 },
                  { label: '5', value: 5 },
                  { label: '8', value: 8 },
                  { label: '10', value: 10 },
                ]}
              />
            </ConfigRow>

            <ConfigRow label="Nombre de manches">
              <Select
                value={room.config.totalRounds}
                onChange={v => handleConfig('totalRounds', v)}
                options={[
                  { label: '3', value: 3 },
                  { label: '5', value: 5 },
                  { label: '8', value: 8 },
                  { label: '10', value: 10 },
                ]}
              />
            </ConfigRow>

            <ConfigRow label="Mode décriveur">
              <Select
                value={room.config.describerMode}
                onChange={v => handleConfig('describerMode', v)}
                options={[
                  { label: 'Rotation aléatoire', value: 'random' },
                  { label: 'Hôte toujours', value: 'host' },
                ]}
              />
            </ConfigRow>
          </div>
        )}

        {/* Config read-only — guests */}
        {!isHost && (
          <div className="bg-gray-900 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Configuration</p>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-500">Timer</span>
              <span>{room.config.timerDuration} s</span>
              <span className="text-gray-500">Emojis max</span>
              <span>{room.config.maxEmojis}</span>
              <span className="text-gray-500">Manches</span>
              <span>{room.config.totalRounds}</span>
              <span className="text-gray-500">Mode</span>
              <span>{room.config.describerMode === 'random' ? 'Rotation aléatoire' : 'Hôte toujours'}</span>
            </div>
          </div>
        )}

        {/* Start / waiting */}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-colors"
          >
            {starting ? 'Démarrage…' : 'Lancer la partie'}
          </button>
        ) : (
          <p className="text-center text-gray-500 text-sm">
            En attente que l'hôte lance la partie…
          </p>
        )}

        {!canStart && isHost && (
          <p className="text-center text-yellow-500 text-sm -mt-2">
            Il faut au moins 2 joueurs pour démarrer.
          </p>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-400">{label}</span>
      {children}
    </div>
  )
}

function Select<T extends string | number>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { label: string; value: T }[]
}) {
  return (
    <select
      value={value}
      onChange={e => {
        const raw = e.target.value
        const parsed = (typeof value === 'number' ? Number(raw) : raw) as T
        onChange(parsed)
      }}
      className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
    >
      {options.map(o => (
        <option key={String(o.value)} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
