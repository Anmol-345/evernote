"use client"

import React, { useState, useEffect } from 'react'

// ==========================================
// Types
// ==========================================

import type { BlockType } from '@/types/block.types'
export type { BlockType }

export interface RichTextMark {
  type: 'bold' | 'italic' | 'underline' | 'strike' | 'link'
  url?: string
}

export interface RichTextRun {
  text: string
  marks?: RichTextMark[]
}

export interface BlockContent {
  type?: BlockType
  rich_text?: RichTextRun[]
  level?: 1 | 2 | 3
  checked?: boolean
  text?: string
  language?: string
  url?: string
  label?: string
  emoji?: string
  attachment_id?: string
  alt?: string
  display_name?: string
  page_id?: string
}

import type { Block } from '@/types/block.types'
export type CanonicalBlock = Block

export function canonicalBlockToTiptapContent(content: BlockContent | undefined): any {
  if (!content) return { type: 'paragraph', content: [{ type: 'text', text: '' }] }
  const runs = content.rich_text || []
  const text = runs.map((r) => r.text).join('')
  return {
    type: content.type || 'paragraph',
    content: [{ type: 'text', text }],
  }
}

export function tiptapContentToBlockContent(tiptapContent: any, blockType: BlockType): BlockContent {
  const text = tiptapContent?.text || tiptapContent?.content?.[0]?.text || ''
  return {
    type: blockType,
    rich_text: [{ text, marks: [] }],
  }
}

export function tiptapHTMLToBlocks(html: string, existingBlocks: CanonicalBlock[]): CanonicalBlock[] {
  const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (existingBlocks.length === 0) {
    return [
      {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'b-1',
        type: 'paragraph',
        content: { rich_text: [{ text: cleanText, marks: [] }] },
        position: 0,
      },
    ]
  }

  return existingBlocks.map((b, idx) => {
    if (idx === 0) {
      return {
        ...b,
        content: {
          ...b.content,
          rich_text: [{ text: cleanText || (b.content.rich_text?.[0]?.text || ''), marks: [] }],
        },
      }
    }
    return b
  })
}

// ==========================================
// Tiptap / Rich Block Editor Component
// ==========================================

export interface TiptapEditorProps {
  initialBlocks: CanonicalBlock[]
  onBlocksChange: (blocks: CanonicalBlock[]) => void
  disabled?: boolean
  className?: string
}

export function TiptapEditor({
  initialBlocks,
  onBlocksChange,
  disabled = false,
  className = '',
}: TiptapEditorProps) {
  const [blocks, setBlocks] = useState<CanonicalBlock[]>(initialBlocks)

  useEffect(() => {
    setBlocks(initialBlocks)
  }, [initialBlocks])

  const updateBlockText = (index: number, newText: string) => {
    const updated = blocks.map((b, i) => {
      if (i !== index) return b
      return {
        ...b,
        content: {
          ...b.content,
          rich_text: [{ text: newText, marks: b.content.rich_text?.[0]?.marks || [] }],
          text: newText,
        },
      }
    })
    setBlocks(updated)
    onBlocksChange(updated)
  }

  const toggleTodo = (index: number) => {
    const updated = blocks.map((b, i) => {
      if (i !== index) return b
      return {
        ...b,
        content: {
          ...b.content,
          checked: !b.content.checked,
        },
      }
    })
    setBlocks(updated)
    onBlocksChange(updated)
  }

  const changeBlockType = (index: number, type: BlockType) => {
    const updated = blocks.map((b, i) => {
      if (i !== index) return b
      return {
        ...b,
        type,
        content: {
          ...b.content,
          type,
        },
      }
    })
    setBlocks(updated)
    onBlocksChange(updated)
  }

  const deleteBlock = (index: number) => {
    const updated = blocks.filter((_, i) => i !== index)
    setBlocks(updated)
    onBlocksChange(updated)
  }

  return (
    <div className={`space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-border pb-2 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Rich Document Editor</span>
        <span>{blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}</span>
      </div>

      <div className="space-y-2">
        {blocks.map((block, index) => {
          const text =
            block.content.rich_text?.[0]?.text ??
            block.content.text ??
            ''

          return (
            <div
              key={block.id || index}
              className="group relative flex items-start gap-2 rounded-md p-1.5 transition-colors hover:bg-accent/40"
            >
              {/* Block type pill or todo checkbox */}
              {block.type === 'todo' ? (
                <input
                  type="checkbox"
                  checked={!!block.content.checked}
                  onChange={() => toggleTodo(index)}
                  disabled={disabled}
                  className="mt-1.5 h-4 w-4 rounded border-border text-primary cursor-pointer"
                />
              ) : (
                <span className="mt-1 min-w-[20px] text-xs font-mono text-muted-foreground text-center">
                  {block.type === 'bulleted_list_item' ? '•' : block.type === 'heading' ? 'H' : '¶'}
                </span>
              )}

              {/* Text input area according to block type */}
              <div className="flex-1">
                {block.type === 'heading' ? (
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => updateBlockText(index, e.target.value)}
                    disabled={disabled}
                    placeholder="Heading..."
                    className="w-full bg-transparent text-xl font-bold text-foreground outline-none focus:ring-0"
                  />
                ) : block.type === 'code' ? (
                  <textarea
                    rows={Math.max(2, text.split('\n').length)}
                    value={text}
                    onChange={(e) => updateBlockText(index, e.target.value)}
                    disabled={disabled}
                    placeholder="// write code here..."
                    className="w-full rounded bg-muted/60 p-2 font-mono text-sm text-foreground outline-none"
                  />
                ) : block.type === 'quote' ? (
                  <div className="border-l-4 border-primary/60 pl-3">
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => updateBlockText(index, e.target.value)}
                      disabled={disabled}
                      placeholder="Quote..."
                      className="w-full bg-transparent italic text-foreground outline-none"
                    />
                  </div>
                ) : (
                  <textarea
                    rows={Math.max(1, Math.min(6, text.split('\n').length))}
                    value={text}
                    onChange={(e) => updateBlockText(index, e.target.value)}
                    disabled={disabled}
                    placeholder="Type content..."
                    className={`w-full resize-none bg-transparent text-sm text-foreground outline-none ${
                      block.type === 'todo' && block.content.checked ? 'line-through opacity-60' : ''
                    }`}
                  />
                )}
              </div>

              {/* Actions toolbar on hover */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                <select
                  value={block.type}
                  onChange={(e) => changeBlockType(index, e.target.value as BlockType)}
                  disabled={disabled}
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground"
                >
                  <option value="paragraph">Text</option>
                  <option value="heading">Heading</option>
                  <option value="bulleted_list_item">Bullet</option>
                  <option value="todo">Todo</option>
                  <option value="quote">Quote</option>
                  <option value="code">Code</option>
                </select>
                <button
                  type="button"
                  onClick={() => deleteBlock(index)}
                  disabled={disabled}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete block"
                >
                  ×
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default TiptapEditor