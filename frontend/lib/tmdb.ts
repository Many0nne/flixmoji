const BASE = 'https://api.themoviedb.org/3'

function apiKey() {
  return process.env.NEXT_PUBLIC_TMDB_API_KEY ?? ''
}

export interface TmdbMovie {
  id: number
  title: string
  release_date: string
  poster_path: string | null
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchMovies(query: string, language = 'fr-FR'): Promise<TmdbMovie[]> {
  if (!query.trim()) return []
  const url = new URL(`${BASE}/search/movie`)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('query', query)
  url.searchParams.set('language', language)
  url.searchParams.set('include_adult', 'false')

  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? []).slice(0, 8) as TmdbMovie[]
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const GENRES = [
  { label: 'Action', id: 28 },
  { label: 'Animation', id: 16 },
  { label: 'Comédie', id: 35 },
  { label: 'Drame', id: 18 },
  { label: 'Horreur', id: 27 },
  { label: 'Romance', id: 10749 },
  { label: 'Science-Fiction', id: 878 },
  { label: 'Thriller', id: 53 },
]

export const DECADES = [
  { label: '80s', gte: '1980-01-01', lte: '1989-12-31' },
  { label: '90s', gte: '1990-01-01', lte: '1999-12-31' },
  { label: '2000s', gte: '2000-01-01', lte: '2009-12-31' },
  { label: '2010s', gte: '2010-01-01', lte: '2019-12-31' },
  { label: '2020s', gte: '2020-01-01', lte: '2029-12-31' },
]

export const COUNTRIES = [
  { label: '🇫🇷 Français', code: 'FR' },
  { label: '🇺🇸 Américain', code: 'US' },
  { label: '🇬🇧 Britannique', code: 'GB' },
  { label: '🇯🇵 Japonais', code: 'JP' },
  { label: '🇰🇷 Coréen', code: 'KR' },
]

export interface DiscoverFilters {
  genreIds?: number[]    // AND logic — multiple genres combined
  decade?: string        // e.g. '90s'
  country?: string       // e.g. 'FR'
}

export async function discoverRandomMovie(
  filters: DiscoverFilters,
  language = 'fr-FR'
): Promise<TmdbMovie | null> {
  const url = new URL(`${BASE}/discover/movie`)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('language', language)
  url.searchParams.set('sort_by', 'popularity.desc')
  url.searchParams.set('vote_count.gte', '50')
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('page', String(Math.floor(Math.random() * 5) + 1))

  if (filters.genreIds && filters.genreIds.length > 0) {
    url.searchParams.set('with_genres', filters.genreIds.join(','))
  }
  if (filters.decade) {
    const decade = DECADES.find(d => d.label === filters.decade)
    if (decade) {
      url.searchParams.set('primary_release_date.gte', decade.gte)
      url.searchParams.set('primary_release_date.lte', decade.lte)
    }
  }
  if (filters.country) {
    url.searchParams.set('with_origin_country', filters.country)
  }

  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = await res.json()
  const results: TmdbMovie[] = data.results ?? []
  if (results.length === 0) return null
  return results[Math.floor(Math.random() * results.length)]
}

export function posterUrl(path: string | null, size = 'w92'): string | null {
  if (!path) return null
  return `https://image.tmdb.org/t/p/${size}${path}`
}
