import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Block, Page } from '@/types/block.types'

export interface SearchResult {
  id: string
  title: string
  preview: string
  pageId: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
}

export function useSearch(debounceMs = 300) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  const onQueryChange = useCallback((newQuery: string) => {
    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    // Set new timeout
    debounceTimeout.current = setTimeout(async () => {
      setQuery(newQuery)
      setLoading(true)
      setError(null)
      setResults([])

      try {
        if (newQuery.trim().length < 2) {
          setResults([])
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('pages')
          .select('*')
          .ilike('title', `%${newQuery}%`)
          .eq('user_id', JSON.parse(localStorage.getItem('supabase-auth-user') || '{}')?.user?.id || '')
          .limit(10)

        if (error) throw error

        const results: SearchResult[] = (data || []).map((page: any) => ({
          id: page.id,
          title: page.title,
          preview: page.title,
          pageId: page.id,
        }))

        setResults(results)
        setLoading(false)
      } catch (err) {
        console.error('Search error:', err)
        setError('Search failed. Please try again.')
        setResults([])
        setLoading(false)
      }
    }, debounceMs)
  }, [])

  const clearSearch = useCallback(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }
    setQuery('')
    setResults([])
    setError(null)
  }, [])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    onQueryChange,
    clearSearch,
  }
}

/**
 * Search page titles and content
 * Uses the existing database indexes and RLS policies
 */
export async function searchPages(
  query: string,
  userId: string
): Promise<SearchResult[]> {
  if (!query.trim()) return []

  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .eq('user_id', userId)
      .limit(20)

    if (error) throw error

    return (data || []).map((page: any) => ({
      id: page.id,
      title: page.title,
      preview: page.title.substring(0, 100) + (page.title.length > 100 ? '...' : ''),
      pageId: page.id,
    }))
  } catch (err) {
    console.error('searchPages error:', err)
    return []
  }
}

/**
 * Debounced search hook for component usage
 */
export function useDebouncedSearch(debounceMs = 300) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)

    // Debounced search
    const timeout = setTimeout(async () => {
      if (!value.trim()) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      const user = JSON.parse(
        localStorage.getItem('supabase-auth-user') || '{}'
      )?.user?.id

      if (!user) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      const results = await searchPages(value, user)
      setSearchResults(results)
      setIsSearching(false)
    }, debounceMs)

    return () => clearTimeout(timeout)
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    handleSearchChange,
  }
}