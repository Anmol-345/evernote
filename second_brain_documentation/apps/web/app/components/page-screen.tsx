"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import PageEditor from './page-editor'
import { useSearch } from '@/components/search'
import { usePageFavorite } from '@/components/tags-favorites'
import { usePageTags } from '@/components/tags-favorites'

export default function PageScreen() {
  const { user } = useAuth()
  const { pageId } = useParams<{ pageId: string }>()

  const [pageTitle, setPageTitle] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSearch, setShowSearch] = useState(false)

  // Search hook
  const { query, results, loading, error, onQueryChange, clearSearch } = useSearch(300)

  // Favorite status for current page
  const { isFavorite, toggleFavorite, loading: favLoading, error: favError } =
    usePageFavorite(pageId || '', user?.userId || '')

  // Tags for current page
  const { tags, addTag, removeTag, loadTags, error: tagsError } =
    usePageTags(pageId || '', user?.userId || '')

  useEffect(() => {
    if (pageId && user) {
      // Fetch page data
      fetchPageData()
      // Load tags
      loadTags()
    }
  }, [pageId, user?.userId])

  const fetchPageData = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('title')
        .eq('id', pageId)
        .eq('user_id', user?.userId)
        .single()

      if (error) throw error
      setPageTitle(data?.title || 'Untitled')
    } catch (err) {
      console.error('Failed to fetch page:', err)
    }
  }

  // Initialize tags load
  useEffect(() => {
    if (pageId && user) {
      loadTags()
    }
  }, [pageId, user?.userId])

  if (!pageId || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <h2 className="text-2xl font-bold">Sign in to access your brain</h2>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Search and Favorites area */}
      <div className="border-b border-border px-6 py-3 mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Search box */}
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M18 10h-1M10 19l4-5-4-5M2 7l10 9-11 5 2-8z" />
              </svg>
              <input
                type="text"
                placeholder="Search pages..."
                className="pl-8 pr-4 py-2 rounded border placeholder-primary/4 focus:outline-none focus:ring-2 focus:ring-primary"
                onChange={(e) => onQueryChange(e.target.value)}
                value={query}
                disabled={loading}
                aria-label="Search pages"
              />
              {loading && (
                <span className="absolute right-3 text-xs text-primary">Searching...</span>
              )}
            </div>
          </div>

          {/* Favorites button */}
          <button
            onClick={() => toggleFavorite()}
            className="rounded-md bg-card px-3 py-2 text-sm hover:bg-accent/20 flex items-center gap-2"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              {isFavorite ? (
                <path d="M17.25 18.25 7.74 8.74a.75.75 0 0 0-1.06 1.06L13.73 14H21a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H14.73l5.46 5.46a.75.75 0 0 0 1.06-1.06z" />
              ) : (
                <path d="M2.25 2.25h11.25a.75.75 0 0 1 .18.5l-6.5 3.66a.75.75 0 0 1-.55 0l-6.5-3.66a.75.75 0 0 1-.18-.5H2.25a.75.75 0 0 1-.75-.75V2.25a.75.75 0 0 1 .75-.75z" />
              )}
            </svg>
            <span className="hidden sm:inline">{isFavorite ? 'Favorited' : 'Favorite'}</span>
          </button>

          {/* Tags chip area */}
          <div className="flex flex-wrap gap-1 ml-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs text-foreground bg-muted/30 hover:bg-muted"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-error hover:text-error/80"
                  aria-label="Remove tag"
                >
                  ×
                </button>
              </span>
            ))}
            {loading && (
              <span className="text-xs text-muted-foreground">Loading...</span>
            )}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="min-h-screen bg-background">
        <nav className="w-64 bg-card border-r border-border flex-shrink-0">
          {/* Simple sidebar with back button */}
          <div className="p-4 border-b border-border">
            <button
              onClick={() => window.history.back()}
              className="w-full flex items-center justify-between text-sm text-primary hover:underline"
              aria-label="Back"
            >
              ← Back
            </button>
          </div>
        </nav>

        <div className="flex-1 flex flex-col overflow-auto p-6">
          <PageEditor pageId={pageId} />
          {/* Search results would appear below the editor if there are search results */}
          {query.trim().length > 0 && !loading && results.length > 0 && (
            <div className="mt-6 p-4 rounded bg-primary/5 border border-primary/10">
              <h4 className="text-sm font-medium text-primary mb-2">
                Search results for{" "}
                <span className="font-normal">{query}</span>
              </h4>
              <ul className="text-sm text-foreground">
                {results.map((result) => (
                  <li key={result.id} className="hover:text-primary transition-colors">
                    <a
                      href={`/pages/${result.id}`}
                      className="underline hover:text-primary/90"
                    >
                      {result.title}
                    </a>
                  </li>
                ))}
              </ul>
              {results.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No results found
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}