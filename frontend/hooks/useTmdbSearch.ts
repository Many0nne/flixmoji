import { useState, useEffect, useRef } from 'react'
import { searchMovies, TmdbMovie } from '@/lib/tmdb'

export function useTmdbSearch(language = 'fr-FR') {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbMovie[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const movies = await searchMovies(query, language)
      setResults(movies)
      setLoading(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, language])

  function clear() {
    setQuery('')
    setResults([])
  }

  return { query, setQuery, results, loading, clear }
}
