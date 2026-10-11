"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { renderBlock, createBlock, getDefaultContent } from '@/components/block-editor'
import type { Block, BlockType } from '@/types/block.types'
import { useAuth } from '@/hooks/use-auth'

interface PageEditorProps {
  pageId?: string
}

export default function PageEditor({ pageId }: PageEditorProps) {
  const { user } = useAuth()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [newBlockText, setNewBlockText] = useState('')
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
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

      setBlocks(blockData || [])
      setServerRevision(data.revision)
    } catch (err) {
      console.error('Failed to fetch page data:', err)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  // Save blocks to server
  const saveBlocks = async () => {
    if (!pageId || !user?.userId || conflict) return

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      // Update page revision first
      const { error: pageError } = await supabase
        .from('pages')
        .update({ revision: serverRevision + 1, updated_at: new Date() })
        .eq('id', pageId)
        .eq('user_id', user.userId)

      if (pageError) throw pageError

      // Update each block
      for (const block of blocks) {
        // Determine if this is a new block or an existing one
        if (block.id.startsWith('temp')) {
          // New block - insert
          const { error: insertError } = await supabase
            .from('blocks')
            .insert({
              id: block.id.replace('temp', crypto.randomUUID()),
              page_id: pageId,
              user_id: user.userId,
              type: block.type,
              content: block.content,
              position: block.position,
              schema_version: block.schema_version ?? 1,
              revision: 1,
            })

          if (insertError) throw insertError
        } else {
          // Existing block - update
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

    const defaultContent = getDefaultContent('paragraph')
    const newBlock = createBlock('paragraph', defaultContent, blocks.length)

    setBlocks([...blocks, newBlock])
    setNewBlockText('')
  }

  // Remove a block
  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId))
  }

  // Start editing a block
  const startEdit = (blockId: string) => {
    setEditingBlockId(blockId)
  }

  // Save edited block
  const saveEdit = async (blockId: string, newContent: any) => {
    setBlocks(
      blocks.map((b) =>
        b.id === blockId ? { ...b, content: newContent, updatedAt: new Date() } : b
      )
    )
    setEditingBlockId(null)
  }

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header with page title and save status */}
      <header className="border-b border-border px-6 py-3">
        <h1 className="text-xl font-bold">{pageTitle}</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Rev {revision}
          </span>
          {isSaving ? (
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
          ) : (
            <span
              onClick={saveBlocks}
              className="text-primary hover:underline cursor-pointer text-xs"
              title="Save (Cmd+S)"
            >
              Save
            </span>
          )}
          <span className="text-xs text-muted-foreground">{saveStatus}</span>
        </div>
      </header>

      {/* Editor area */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-4">
          {/* Block editor UI */}
          <div className="bg-card rounded-lg p-4 min-h-[200px]">
            {/* Toolbar */}
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
            </div>

            {/* Editor content - display blocks */}
            <div
              ref={null}
              className="prose max-w-none break-normal"
              dangerouslySetInnerHTML={{
                __html: blocks.map(renderBlock).map((node) => {
                  if (typeof node === 'string') return node
                  if (!node) return ''
                  return String(node)
                }).join(''),
              }}
            />
          </div>

          {/* Add new block form */}
          {editingBlockId && (
            <div className="mt-3 p-3 rounded border border-border">
              <input
                ref={null}
                onChange={(e) => {
                  // Handle inline editing
                }}
                defaultValue={newBlockText}
                className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => saveEdit(editingBlockId, { rich_text: [{ text: newBlockText, marks: [] }] })}
                  className="rounded-md border bg-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingBlockId(null)}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-error/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}