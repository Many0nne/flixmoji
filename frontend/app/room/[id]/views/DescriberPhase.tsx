'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Theme } from 'emoji-picker-react'
import { useGame } from '@/context/GameContext'
import { useTmdbSearch } from '@/hooks/useTmdbSearch'
import { discoverRandomMovie, posterUrl, GENRES, DECADES, COUNTRIES, TmdbMovie, DiscoverFilters } from '@/lib/tmdb'
import Timer from './components/Timer'

// Promise created once at module level — reused by dynamic(), no re-fetch on re-render
const emojiPickerPromise = import('emoji-picker-react')
const EmojiPicker = dynamic(() => emojiPickerPromise, { ssr: false })

type Tab = 'category' | 'search'

export default function DescriberPhase() {
  const { state, selectMovie, submitEmojis } = useGame()
  const { currentRound, remainingMs, room } = state
  const maxEmojis = room?.config.maxEmojis ?? 5
  const timerDuration = (room?.config.timerDuration ?? 60) * 1000

  const [tab, setTab] = useState<Tab>('category')
  const [selectedMovie, setSelectedMovie] = useState<TmdbMovie | null>(null)
  const [emojis, setEmojis] = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Combined filters state ──────────────────────────────────────────────────
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([])
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const hasFilters = selectedGenreIds.length > 0 || selectedDecade !== null || selectedCountry !== null

  const { query, setQuery, results, loading: searching, clear } = useTmdbSearch()

  const isGuessing = currentRound?.status === 'guessing'

  // Reset local state on each new round (roundNumber change)
  useEffect(() => {
    setSelectedMovie(null)
    setEmojis([])
    setShowPicker(false)
    setSubmitting(false)
    setError(null)
    setSelectedGenreIds([])
    setSelectedDecade(null)
    setSelectedCountry(null)
  }, [currentRound?.roundNumber])

  // ─── Filter toggles ──────────────────────────────────────────────────────────

  function toggleGenre(id: number) {
    setSelectedGenreIds(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  function toggleDecade(label: string) {
    setSelectedDecade(prev => prev === label ? null : label)
  }

  function toggleCountry(code: string) {
    setSelectedCountry(prev => prev === code ? null : code)
  }

  function clearFilters() {
    setSelectedGenreIds([])
    setSelectedDecade(null)
    setSelectedCountry(null)
  }

  // ─── Movie discovery ─────────────────────────────────────────────────────────

  async function handleDiscover() {
    setDiscovering(true)
    setSelectedMovie(null)
    const filters: DiscoverFilters = {
      genreIds: selectedGenreIds.length > 0 ? selectedGenreIds : undefined,
      decade: selectedDecade ?? undefined,
      country: selectedCountry ?? undefined,
    }
    const movie = await discoverRandomMovie(filters)
    if (movie) {
      setSelectedMovie(movie)
      await selectMovie(movie.id, movie.title).catch(() => {})
    }
    setDiscovering(false)
  }

  async function handleSelectFromSearch(movie: TmdbMovie) {
    setSelectedMovie(movie)
    clear()
    await selectMovie(movie.id, movie.title).catch(() => {})
  }

  // ─── Emoji management ────────────────────────────────────────────────────────

  const handleEmojiClick = useCallback((emojiData: { emoji: string }) => {
    setEmojis(prev => prev.length >= maxEmojis ? prev : [...prev, emojiData.emoji])
    setShowPicker(false)
  }, [maxEmojis])

  function removeEmoji(index: number) {
    setEmojis(prev => prev.filter((_, i) => i !== index))
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!selectedMovie) return setError('Sélectionne un film d\'abord.')
    if (emojis.length === 0) return setError('Ajoute au moins un emoji.')
    setError(null)
    setSubmitting(true)
    try {
      await submitEmojis(emojis)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur.')
      setSubmitting(false)
    }
  }

  // ─── Guessing phase — describer waiting view ──────────────────────────────────

  if (isGuessing) {
    const correctCount = new Set(
      state.guessResults.filter(g => g.isCorrect).map(g => g.playerPseudo)
    ).size
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <Timer remainingMs={remainingMs} totalMs={timerDuration} />
        <div className="bg-gray-900 rounded-2xl p-6 w-full text-center flex flex-col gap-4">
          <p className="text-gray-400 text-sm">Ta séquence</p>
          <div className="flex flex-wrap justify-center gap-2 text-4xl">
            {emojis.map((e, i) => <span key={i}>{e}</span>)}
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-indigo-400">{correctCount}</span>
            <span className="text-gray-500 text-sm ml-2">
              joueur{correctCount > 1 ? 's' : ''} {correctCount > 1 ? 'ont' : 'a'} trouvé
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ─── Composing phase ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <p className="text-center text-gray-500 text-sm">Tu es le décriveur — fais deviner ce film !</p>

      {/* Movie selection */}
      <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <TabBtn active={tab === 'category'} onClick={() => setTab('category')}>Catégorie</TabBtn>
          <TabBtn active={tab === 'search'} onClick={() => setTab('search')}>Rechercher</TabBtn>
        </div>

        {/* ── Category tab — combinable filters ───────────────────────────────── */}
        {tab === 'category' && (
          <div className="flex flex-col gap-4">

            {/* Genres — multi-select */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-gray-500">Genres <span className="text-gray-600">(cumulables)</span></p>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map(g => (
                  <Chip
                    key={g.id}
                    active={selectedGenreIds.includes(g.id)}
                    onClick={() => toggleGenre(g.id)}
                  >
                    {g.label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Decades — single select */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-gray-500">Décennie</p>
              <div className="flex flex-wrap gap-1.5">
                {DECADES.map(d => (
                  <Chip
                    key={d.label}
                    active={selectedDecade === d.label}
                    onClick={() => toggleDecade(d.label)}
                  >
                    {d.label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Countries — single select */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-gray-500">Cinéma national</p>
              <div className="flex flex-wrap gap-1.5">
                {COUNTRIES.map(c => (
                  <Chip
                    key={c.code}
                    active={selectedCountry === c.code}
                    onClick={() => toggleCountry(c.code)}
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDiscover}
                disabled={discovering}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold transition-colors"
              >
                {discovering ? 'Tirage…' : hasFilters ? '🎲 Tirer un film' : '🎲 Tirer au hasard'}
              </button>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-400 transition-colors"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Search tab ──────────────────────────────────────────────────────── */}
        {tab === 'search' && (
          <div className="flex flex-col gap-2">
            <input
              className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Rechercher un film…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {searching && <p className="text-xs text-gray-500 text-center animate-pulse">Recherche…</p>}
            {results.length > 0 && (
              <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {results.map(movie => (
                  <li key={movie.id}>
                    <button
                      onClick={() => handleSelectFromSearch(movie)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 text-left transition-colors"
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
          </div>
        )}

        {/* Selected movie */}
        {selectedMovie && (
          <div className="flex items-center gap-3 bg-indigo-900/30 border border-indigo-700 rounded-xl p-3">
            {posterUrl(selectedMovie.poster_path) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posterUrl(selectedMovie.poster_path)!} alt="" className="w-10 h-14 object-cover rounded" />
            )}
            <div>
              <p className="text-xs text-indigo-400 uppercase tracking-widest">Film sélectionné</p>
              <p className="font-bold">{selectedMovie.title}</p>
              <p className="text-xs text-gray-500">{selectedMovie.release_date?.slice(0, 4)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Emoji composer */}
      <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Séquence d'emojis</p>
          <span className="text-xs text-gray-500">{emojis.length}/{maxEmojis}</span>
        </div>

        <div className="flex flex-wrap gap-2 min-h-10">
          {emojis.map((e, i) => (
            <button
              key={i}
              onClick={() => removeEmoji(i)}
              className="text-3xl hover:opacity-60 transition-opacity relative group"
              title="Supprimer"
            >
              {e}
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-xs items-center justify-center hidden group-hover:flex">×</span>
            </button>
          ))}
          {emojis.length === 0 && (
            <p className="text-gray-600 text-sm italic">Clique sur + pour ajouter des emojis</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowPicker(v => !v)}
            disabled={emojis.length >= maxEmojis}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-sm transition-colors"
          >
            {showPicker ? 'Fermer' : '+ Emoji'}
          </button>
          {emojis.length > 0 && (
            <button onClick={() => setEmojis([])} className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-400 transition-colors">
              Effacer
            </button>
          )}
        </div>

        {/* Picker always mounted — toggled via visibility only to avoid remount lag */}
        <div className={showPicker ? 'mt-1' : 'invisible overflow-hidden h-0'}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.DARK}
            width="100%"
            height={350}
            searchPlaceholder="Chercher un emoji…"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!selectedMovie || emojis.length === 0 || submitting}
        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg transition-colors"
      >
        {submitting ? 'Envoi…' : 'Révéler mes emojis 🎬'}
      </button>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
    >
      {children}
    </button>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm transition-colors border
        ${active
          ? 'bg-indigo-600 border-indigo-500 text-white'
          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'}`}
    >
      {children}
    </button>
  )
}
