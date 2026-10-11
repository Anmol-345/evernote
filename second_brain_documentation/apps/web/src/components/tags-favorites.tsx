import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Block, Tag } from '@/types/block.types'

export interface PageTags {
  pageId: string
  tags: string[]
}

/**
 * Get tags for a specific page by joining page_tags with tags
 */
export async function getPageTags(pageId: string, userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('page_tags')
      .select(`
        tag_id,
        tags (
          name,
          normalized_name
        )
      `)
      .eq('page_id', pageId)

    if (error) throw error

    return (data || []).map((pt: any) => pt.tags?.name || pt.name).filter(Boolean)
  } catch (err) {
    console.error('getPageTags error:', err)
    return []
  }
}

/**
 * Add tags to a page
 * Normalizes tag names (lowercase, trim) - matches DB generated column
 * 1. Upsert into tags table
 * 2. Insert into page_tags join table
 */
export async function addPageTags(
  pageId: string,
  tagNames: string[],
  userId: string
): Promise<void> {
  try {
    // Normalize tags: lowercase, trim, filter empty
    const normalizedTags = tagNames
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0 && tag.length <= 80)

    if (normalizedTags.length === 0) return

    // Use a transaction-like approach: for each tag, upsert into tags, then link
    for (const tag of normalizedTags) {
      // Upsert into tags table - the normalized_name is generated stored column
      const { error: tagError } = await supabase
        .from('tags')
        .upsert(
          { name: tag }, // normalized_name is generated: lower(trim(name)), stored computed
          { onConflict: 'tags_user_normalized_unique' }
        )

      if (tagError) throw tagError

      // Get the tag id (we can look it up by normalized name since it's unique)
      const { data: tagData, error: selectError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tag)
        .eq('user_id', userId)
        .single()

      if (selectError) throw selectError

      // Link tag to page via page_tags
      const { error: pageTagError } = await supabase
        .from('page_tags')
        .upsert(
          { page_id: pageId, tag_id: tagData.id, user_id: userId },
          { onConflict: 'page_id_tag_id' }
        )

      if (pageTagError) throw pageTagError
    }
  } catch (err) {
    console.error('addPageTags error:', err)
    throw err
  }
}

/**
 * Remove a tag from a page
 * Delete from page_tags join table
 */
export async function removePageTag(
  pageId: string,
  tagName: string,
  userId: string
): Promise<void> {
  try {
    const { data: tagData, error: tagSelectError } = await supabase
      .from('tags')
      .select('id')
      .eq('name', tagName.toLowerCase().trim())
      .eq('user_id', userId)
      .single()

    if (tagSelectError) throw tagSelectError

    const { error: deleteError } = await supabase
      .from('page_tags')
      .delete()
      .eq('page_id', pageId)
      .eq('tag_id', tagData.id)

    if (deleteError) throw deleteError
  } catch (err) {
    console.error('removePageTag error:', err)
    throw err
  }
}

/**
 * Toggle a tag on a page (add if not present, remove if present)
 */
export async function togglePageTag(
  pageId: string,
  tagName: string,
  userId: string
): Promise<{ added: boolean; tags: string[] }> {
  try {
    // Normalize the tag name
    const normalizedTag = tagName.trim().toLowerCase()

    const currentTags = await getPageTags(pageId, userId)
    const exists = currentTags.some((t) => t.toLowerCase().trim() === normalizedTag)

    if (exists) {
      await removePageTag(pageId, tagName, userId)
      const tags = await getPageTags(pageId, userId)
      return { added: false, tags }
    } else {
      await addPageTags(pageId, [tagName], userId)
      const tags = await getPageTags(pageId, userId)
      return { added: true, tags }
    }
  } catch (err) {
    console.error('togglePageTag error:', err)
    throw err
  }
}

/**
 * Component: Tag input and display
 */
export function usePageTags(
  pageId: string,
  userId: string
) {
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load tags on mount
  useEffect(() => {
    loadTags()
  }, [pageId, userId])

  const loadTags = useCallback(async () => {
    setLoading(true)
    try {
      const fetchedTags = await getPageTags(pageId, userId)
      setTags(fetchedTags)
    } catch (err) {
      setError('Failed to load tags')
    } finally {
      setLoading(false)
    }
  }, [pageId, userId])

  const handleTagChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTag(e.target.value)
  }, [])

  const addTag = useCallback(async () => {
    const tag = newTag.trim()
    if (!tag) return

    setLoading(true)
    try {
      const { added, tags: updatedTags } = await togglePageTag(
        pageId,
        tag,
        userId
      )
      setTags(updatedTags)
      setNewTag('')
    } catch (err) {
      setError('Failed to add/remove tag')
    } finally {
      setLoading(false)
    }
  }, [newTag, pageId, userId])

  const removeTag = useCallback(async (tagToRemove: string) => {
    setLoading(true)
    try {
      await removePageTag(pageId, tagToRemove, userId)
      const updatedTags = tags.filter((t) => t !== tagToRemove)
      setTags(updatedTags)
    } catch (err) {
      setError('Failed to remove tag')
    } finally {
      setLoading(false)
    }
  }, [tags, pageId, userId])

  return {
    tags,
    newTag,
    setNewTag,
    loading,
    error,
    handleTagChange,
    addTag,
    removeTag,
    loadTags,
  }
}

/**
 * Component: Favorites management
 */

export interface Favorite {
  id: string
  page_id: string
  user_id: string
  created_at: string
}

/**
 * Get favorite status for a page
 */
export async function isPageFavorite(
  pageId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('page_id', pageId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found, which is fine
    return !!data
  } catch (err) {
    console.error('isPageFavorite error:', err)
    return false
  }
}

/**
 * Toggle favorite status for a page
 */
export async function togglePageFavorite(
  pageId: string,
  userId: string
): Promise<{ isFavorite: boolean }> {
  try {
    // Check if already favorited
    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('*')
      .eq('page_id', pageId)
      .eq('user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') throw checkError

    if (existing) {
      // Already favorited - remove it
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('page_id', pageId)
        .eq('user_id', userId)

      if (deleteError) throw deleteError
      return { isFavorite: false }
    } else {
      // Not favorited - add it
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({ page_id: pageId, user_id: userId })

      if (insertError) throw insertError
      return { isFavorite: true }
    }
  } catch (err) {
    console.error('togglePageFavorite error:', err)
    throw err
  }
}

/**
 * Component: Favorites hook
 */
export function usePageFavorite(
  pageId: string,
  userId: string
) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check favorite status on mount
  useEffect(() => {
    checkFavorite()
  }, [pageId, userId])

  const checkFavorite = useCallback(async () => {
    setLoading(true)
    try {
      const favorite = await isPageFavorite(pageId, userId)
      setIsFavorite(favorite)
    } catch (err) {
      setError('Failed to check favorite status')
    } finally {
      setLoading(false)
    }
  }, [pageId, userId])

  const toggleFavorite = useCallback(async () => {
    setLoading(true)
    try {
      const result = await togglePageFavorite(pageId, userId)
      setIsFavorite(result.isFavorite)
    } catch (err) {
      setError('Failed to toggle favorite')
    } finally {
      setLoading(false)
    }
  }, [pageId, userId])

  return {
    isFavorite,
    setIsFavorite,
    loading,
    error,
    checkFavorite,
    toggleFavorite,
  }
}