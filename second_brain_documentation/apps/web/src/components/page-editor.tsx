"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { renderBlock, createBlock, getDefaultContent } from '@/components/block-editor'
import type { Block, BlockType } from '@/types/block.types'
import { useAuth } from '@/hooks/use-auth'
import { TiptapEditor, tiptapHTMLToBlocks, type CanonicalBlock, type BlockContent } from '@/components/TiptapEditor'
import { usePageFavorite } from '@/components/tags-favorites'
import { usePageTags } from '@/components/tags-favorites'

interface PageEditorProps {
  pageId?: string
}

export default function PageEditor({ pageId }: PageEditorProps) {
  const { user } = useAuth()
  const [blocks, setBlocks] = useState<CanonicalBlock[]>([])
  const [pageTitle, setPageTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [revision, setRevision] = useState(1)
  const [serverRevision, setServerRevision] = useState(1)
  const [isOnline, setIsOnline] = useState(true)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
    }
  }, [])
  const [conflict, setConflict] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [showTiptap, setShowTiptap] = useState(false)
  const [newBlockType, setNewBlockType] = useState<BlockType>('paragraph')
  const [newBlockText, setNewBlockText] = useState('')
  const [pageAction, setPageAction] = useState<'none' | 'create' | 'rename' | 'archive' | 'restore'>('none')
  const [pageName, setPageName] = useState('')
  const [moveTargetPageId, setMoveTargetPageId] = useState<string | null>(null)
  const [confirmMessage, setConfirmMessage] = useState<string>('')
  const [confirmAction, setConfirmAction] = useState<'none' | 'delete' | 'archive'>('none')
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; title: string }[]>([])
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const editorRef = useRef<any>(null)

  // Favorite and tags hooks
  const { isFavorite, toggleFavorite, loading: favLoading, error: favError } =
    usePageFavorite(pageId || '', user?.userId || '')
  const { tags, addTag, removeTag, loadTags, error: tagsError } =
    usePageTags(pageId || '', user?.userId || '')

  // Fetch page data
  useEffect(() => {
    if (pageId && user) {
      fetchPageData()
    }
  }, [pageId, user?.userId])

  const fetchPageData = async () => {
    if (!pageId || !user?.userId) return

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .eq('user_id', user.userId)
        .single()

      if (error) throw error

      setPageTitle(data.title)

      // Fetch blocks
      const { data: blockData, error: blockError } = await supabase
        .from('blocks')
        .select('*')
        .eq('page_id', pageId)
        .order('position')

      if (blockError) throw blockError

      // Fetch parent chain for breadcrumbs
      const { data: parentPages, error: parentError } = await supabase
        .from('pages')
        .select('id, title, parent_id')
        .in('id', [pageId])

      if (parentError) throw parentError

      // Build breadcrumbs
      const crumbs: { id: string; title: string }[] = []
      let currentId: string | null = pageId
      while (currentId) {
        const parent = parentPages?.find((p: any) => p.id === currentId)
        if (parent) {
          crumbs.unshift({ id: parent.id, title: parent.title })
          currentId = parent.parent_id
        } else {
          break
        }
      }
      setBreadcrumbs(crumbs)

      // Convert database blocks to canonical format
      const canonicalBlocks: CanonicalBlock[] = (blockData || []).map((dbBlock: any) => ({
        id: dbBlock.id,
        type: dbBlock.type,
        content: dbBlock.content as BlockContent,
        position: dbBlock.position,
        parentBlockId: dbBlock.parent_block_id || null,
        schemaVersion: dbBlock.schema_version || 1,
        revision: dbBlock.revision || 1,
        createdAt: new Date(dbBlock.created_at),
        updatedAt: new Date(dbBlock.updated_at),
      }))

      setBlocks(canonicalBlocks)
      setServerRevision(data.revision)
    } catch (err) {
      console.error('Failed to fetch page data:', err)
      setSaveStatus('error')
      if ((err as Error).message?.includes('access denied') || (err as Error).message?.includes('not found')) {
        setPageTitle('Page unavailable')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Initialize Tiptap editor with initial blocks
  useEffect(() => {
    if (blocks && blocks.length > 0) {
      setShowTiptap(true)
    }
  }, [blocks])

  // Favorite toggle
  const handleFavoriteToggle = useCallback(async () => {
    try {
      const result = await toggleFavorite()
    } catch (err) {
      console.error('Favorite toggle failed:', err)
    }
  }, [toggleFavorite])

  // Tag add
  const handleTagAdd = useCallback(async () => {
    if (!newBlockText.trim()) return
    try {
      await addTag()
    } catch (err) {
      console.error('Tag add failed:', err)
    }
  }, [newBlockText, addTag])

  // Save blocks to server
  const saveBlocks = async () => {
    if (!pageId || !user?.userId || conflict) return

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      // Validate all blocks against schema
      for (const block of blocks) {
        if (!block.type) throw new Error('Missing block type')
        if (!block.content) throw new Error('Missing block content')
      }

      // Update page revision first
      const { error: pageError } = await supabase
        .from('pages')
        .update({ revision: serverRevision + 1, updated_at: new Date() })
        .eq('id', pageId)
        .eq('user_id', user.userId)

      if (pageError) throw pageError

      // Update each block - handle new vs existing blocks
      for (const block of blocks) {
        if (block.id.startsWith('temp')) {
          // New block - insert
          const { error: insertError } = await supabase
            .from('blocks')
            .insert({
              id: block.id,
              page_id: pageId,
              user_id: user.userId,
              type: block.type,
              content: block.content,
              position: block.position,
              schema_version: block.schemaVersion,
              revision: 1,
            })

          if (insertError) throw insertError
        } else {
          // Existing block - update with revision check
          const { error: updateError } = await supabase
            .from('blocks')
            .update({
              content: block.content,
              updated_at: new Date(),
              revision: (block.revision ?? 1) + 1,
            })
            .eq('id', block.id)
            .eq('user_id', user.userId)

          if (updateError) throw updateError
        }
      }

      // Update local revision
      setRevision(serverRevision + 1)
      setServerRevision(serverRevision + 1)
      setSaveStatus('saved')
    } catch (err) {
      console.error('Save failed:', err)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  // Add a new block
  const addBlock = () => {
    if (!newBlockText.trim()) return

    const defaultContent = getDefaultContent(newBlockType)
    const newBlock: CanonicalBlock = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'b-' + Date.now(),
      type: newBlockType,
      content: defaultContent,
      position: blocks.length,
      parentBlockId: null,
      parent_block_id: null,
      schemaVersion: 1,
      schema_version: 1,
      revision: 1,
      createdAt: new Date(),
      created_at: new Date(),
      updatedAt: new Date(),
      updated_at: new Date(),
    }

    setBlocks([...blocks, newBlock])
    setNewBlockText('')
    setNewBlockType('paragraph')
  }

  // Remove a block
  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId))
  }

  // Start editing a block - switch to Tiptap mode
  const startEdit = (blockId: string) => {
    setEditingBlockId(blockId)
    setShowTiptap(true)
  }

  // Save edited block from Tiptap
  const saveEdit = useCallback((blockId: string, newContent: BlockContent) => {
    setBlocks(
      blocks.map((b) =>
        b.id === blockId ? { ...b, content: newContent, updatedAt: new Date() } : b
      )
    )
    setEditingBlockId(null)
    setShowTiptap(false)
  }, [blocks, setEditingBlockId])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Close modals on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRenameModalOpen(false)
        setArchiveModalOpen(false)
        setConfirmModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  // Modal actions
  const createPage = async () => {
    if (!pageName.trim() || !user?.userId) return
    try {
      const { data, error } = await supabase
        .from('pages')
        .insert({
          title: pageName.trim(),
          user_id: user.userId,
          parent_id: moveTargetPageId,
        })
        .select()
        .single()
      if (error) throw error
      setPageAction('none')
      setPageName('')
      if (data?.id) window.location.href = `/pages/${data.id}`
    } catch (e) {
      console.error('Failed to create page:', e)
    }
  }

  const renamePage = async () => {
    if (!pageName.trim() || !pageId || !user?.userId) return
    try {
      const { error } = await supabase
        .from('pages')
        .update({ title: pageName.trim(), updated_at: new Date() })
        .eq('id', pageId)
        .eq('user_id', user.userId)
      if (error) throw error
      setPageTitle(pageName.trim())
      setRenameModalOpen(false)
      setPageAction('none')
      setPageName('')
    } catch (e) {
      console.error('Failed to rename page:', e)
    }
  }

  const handleConfirm = async () => {
    if (!pageId || !user?.userId) return
    if (confirmAction === 'archive' || confirmAction === 'delete') {
      try {
        await supabase
          .from('pages')
          .update({ deleted_at: new Date() })
          .eq('id', pageId)
          .eq('user_id', user.userId)
        window.location.href = '/'
      } catch (e) {
        console.error('Failed to archive/delete page:', e)
      }
    }
    setConfirmModalOpen(false)
    setConfirmAction('none')
  }

  const handleCancel = () => {
    setRenameModalOpen(false)
    setArchiveModalOpen(false)
    setConfirmModalOpen(false)
    setConfirmAction('none')
    setPageAction('none')
  }

  if (!pageId && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <h2 className="text-2xl font-bold">Sign in to access your brain</h2>
      </div>
    )
  }

  if (!pageId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <h2 className="text-2xl font-bold">Select a page to edit</h2>
      </div>
    )
  }

  if (isOnline === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="bg-warning/10 border border-warning rounded p-4 mb-4">
          <svg className="w-6 h-6 mb-2" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-warning">You are offline</p>
          <p className="text-sm">Your changes will be saved when you come back online</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
        >
          Retry
        </button>
      </div>
    )
  }

  // Determine if we should show Tiptap editor or block renderer
  const hasRichTextContent = blocks.some(
    (b) => b.type === 'paragraph' || b.type === 'heading' || b.type === 'todo' || b.type === 'quote' || b.type === 'code'
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="border-b border-border px-6 py-3 mb-4">
          <ol className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb) => (
              <li key={crumb.id}>
                <a
                  href={`/pages/${crumb.id}`}
                  className={crumb.id === pageId ? 'font-medium text-primary' : 'hover:text-primary transition-colors'}
                >
                  {crumb.title}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`/pages/${pageId}`}
                className="font-medium text-primary hover:text-primary transition-colors"
              >
                {pageTitle}
              </a>
            </li>
          </ol>
        </nav>
      )}

      {/* Header with page title, save status, favorite, and page management actions */}
      <header className="border-b border-border px-6 py-3">
        <h1 className="text-xl font-bold">{pageTitle}</h1>

        {/* Header actions: favorite, tags, new page */}
        <div className="ml-auto flex items-center gap-2">
          {/* Favorite button */}
          <button
            onClick={handleFavoriteToggle}
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

          {/* Tags input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add tag..."
              className="rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary flex-1"
              onChange={(e) => setNewBlockText(e.target.value)}
              maxLength={50}
              disabled={isSaving}
            />
            <button
              onClick={handleTagAdd}
              className="rounded-md border bg-primary px-2 py-1 text-xs text-white hover:bg-primary/90"
              disabled={isSaving}
              aria-label="Add tag"
            >
              +
            </button>
          </div>

          {/* Current tags display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground bg-muted/30 hover:bg-muted"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-error hover:text-error/80 text-xs"
                    aria-label="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* New Page button */}
          <button
            onClick={() => {
              setPageAction('create')
              setPageName('')
              setMoveTargetPageId(null)
            }}
            className="rounded-md border bg-secondary px-3 py-1.5 text-sm text-secondary hover:bg-secondary/90"
            aria-label="Create new page"
          >
            + New Page
          </button>
        </div>
      </header>

      {/* Page action modals - Create new page */}
      {pageAction === 'create' && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h3 className="mb-4 text-lg font-bold">Create New Page</h3>
            <p className="text-muted-foreground mb-4">
              Select where to create the new page
            </p>
            <div className="mb-4">
              <label className="block text-sm text-foreground mb-2">
                Page title
              </label>
              <input
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                placeholder="Enter page title"
                className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-foreground mb-2">
                Place under
              </label>
              <div className="space-y-1">
                {breadcrumbs.map((crumb) => (
                  <label
                    key={crumb.id}
                    className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-1.5 hover:bg-accent/20 select-none"
                    onClick={() => setMoveTargetPageId(crumb.id)}
                  >
                    <span>{crumb.title}</span>
                  </label>
                ))}
                <span className="text-xs text-muted-foreground">(Root page / no parent)</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => createPage()}
                className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm text-white"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setPageAction('none')
                  setPageName('')
                }}
                className="flex-1 rounded-md border px-3 py-1.5 text-sm hover:bg-border"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename page modal */}
      {renameModalOpen && pageAction === 'rename' && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h3 className="mb-4 text-lg font-bold">Rename Page</h3>
            <p className="text-muted-foreground mb-4">Enter a new title for the page</p>
            <input
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              placeholder="New page title"
              className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-primary mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => renamePage()}
                className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm text-white"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setRenameModalOpen(false)
                  setPageAction('none')
                  setPageName('')
                }}
                className="flex-1 rounded-md border px-3 py-1.5 text-sm hover:bg-border"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive confirmation modal */}
      {confirmModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="bg-card rounded-lg p-6 w-full max-w-md text-left">
            <h3 className="mb-4 text-lg font-bold">Archive Page</h3>
            <p className="text-muted-foreground mb-4">
              {confirmMessage}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleConfirm()}
                className="flex-1 rounded-md bg-error px-3 py-1.5 text-sm text-white"
              >
                Archive
              </button>
              <button
                onClick={() => handleCancel()}
                className="flex-1 rounded-md border px-3 py-1.5 text-sm hover:bg-border"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor area */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-4">

          {/* Block insertion toolbar */}
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={() => addBlock()}
              className="rounded-md border bg-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/90"
              aria-label="Add block (Ctrl+Enter)"
            >
              + Block
            </button>

            <button
              onClick={() => setNewBlockText('heading')}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              aria-label="Heading"
            >
              Heading
            </button>
            <button
              onClick={() => setNewBlockText('bulleted_list_item')}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              aria-label="Bullet list"
            >
              • List
            </button>
            <button
              onClick={() => setNewBlockText('todo')}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              aria-label="Todo"
            >
              ☐ Todo
            </button>
            <button
              onClick={() => setNewBlockText('quote')}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              aria-label="Quote"
            >
              " Quote
            </button>
          </div>

          {/* Editor content area */}
          {showTiptap && blocks.length > 0 ? (
            <TiptapEditor
              initialBlocks={blocks}
              onBlocksChange={setBlocks}
              disabled={isSaving}
              className="editor-container"
            />
          ) : (
            // Display mode: render blocks using the block renderer
            <div className="bg-card rounded-lg p-4 min-h-[300px]">
              <div className="prose max-w-none break-normal">
                {blocks.map((block) => (
                  <div key={block.id} className="mb-4">
                    {renderBlock(block)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new block form - shown when not in Tiptap mode */}
          {!showTiptap && (
            <div className="mt-3 p-3 rounded border border-border">
              <div className="mb-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setNewBlockText('heading')}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  aria-label="Heading"
                >
                  Heading
                </button>
                <button
                  onClick={() => setNewBlockText('bulleted_list_item')}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  aria-label="Bullet list"
                >
                  • List
                </button>
                <button
                  onClick={() => setNewBlockText('todo')}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  aria-label="Todo"
                >
                  ☐ Todo
                </button>
                <button
                  onClick={() => setNewBlockText('quote')}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  aria-label="Quote"
                >
                  " Quote
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click a block type above to add it, or start editing with the Tiptap editor
              </p>
            </div>
          )}

          {/* Tiptap editor controls (when in Tiptap mode) */}
          {showTiptap && (
            <div className="mt-3 p-3 rounded border border-border">
              <button
                onClick={() => setShowTiptap(false)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-border"
              >
                Return to Reading View
              </button>
              <p className="text-xs text-muted-foreground mt-1">
                Use the toolbar above to format text, add headers, lists, and more
              </p>
            </div>
          )}

          {/* Block editor UI (fallback when no blocks or Tiptap not available) */}
          {!showTiptap && blocks.length === 0 && (
            <div className="bg-card rounded-lg p-8 text-center">
              <div className="mb-4 text-4xl opacity-50">💡</div>
              <h3 className="mb-2">Start your knowledge base</h3>
              <p className="text-muted-foreground">
                Create your first page by adding a block above
              </p>
              <button
                onClick={() => setNewBlockText('paragraph')}
                className="mt-3 rounded-md border bg-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/90"
              >
                + Add Paragraph
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}