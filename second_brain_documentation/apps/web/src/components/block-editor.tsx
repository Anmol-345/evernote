import type { Block, BlockType, RichTextRun, RichText, BlockContent } from '@/types/block.types'
export type { Block, BlockType, RichTextRun, RichText, BlockContent }

const generateBlockId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11))

// Block type renderers
type BlockRenderer = (block: Block) => React.ReactNode

const blockRenderers: Record<BlockType, BlockRenderer> = {
  paragraph: (block) => {
    const text = block.content?.rich_text?.runs?.[0]?.text || ''
    return (
      <p className="break-normal whitespace-pre-wrap">{text}</p>
    )
  },

  heading: (block) => {
    const level = block.content?.level || 1
    const text = block.content?.rich_text?.runs?.[0]?.text || ''
    const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
    return (
      <Tag className="my-2 text-{level === 1 ? '2xl' : level === 2 ? 'xl' : 'lg'} font-bold break-normal whitespace-pre-wrap">
        {text}
      </Tag>
    )
  },

  bulleted_list_item: (block) => {
    const text = block.content?.rich_text?.runs?.[0]?.text || ''
    return (
      <li className="list-disc list-inside my-1 break-normal whitespace-pre-wrap">
        {text}
      </li>
    )
  },

  numbered_list_item: (block) => {
    const text = block.content?.rich_text?.runs?.[0]?.text || ''
    return (
      <li className="list-decimal list-inside my-1 break-normal whitespace-pre-wrap">
        {text}
      </li>
    )
  },

  todo: (block) => {
    const checked = block.content?.checked ?? false
    const text = block.content?.rich_text?.runs?.[0]?.text || ''
    return (
      <div className="flex items-start my-1">
        <input
          type="checkbox"
          checked={checked}
          className="w-4 h-4 rounded border my-1 transform scale-110"
        />
        <span className="flex-1 break-normal whitespace-pre-wrap ml-2">{text}</span>
      </div>
    )
  },

  quote: (block) => {
    const text = block.content?.rich_text?.runs?.[0]?.text || ''
    return (
      <blockquote className="my-2 pl-4 border-l-4 border-muted-foreground break-normal whitespace-pre-wrap">
        {text}
      </blockquote>
    )
  },

  code: (block) => {
    const language = block.content?.language || 'text'
    const text = block.content?.text || ''
    return (
      <pre className="my-2 rounded bg-muted p-4 break-all overflow-x-auto">
        <code className="token text-sm">{text}</code>
      </pre>
    )
  },

  divider: () => {
    return <hr className="my-2 border-t border-border" />
  },

  callout: (block) => {
    const emoji = block.content?.emoji || ''
    const text = block.content?.rich_text?.runs?.[0]?.text || ''
    return (
      <div className="my-2 p-3 rounded bg-accent/10 border border-accent/20">
        {emoji && <span className="text-xl mr-2">{emoji}</span>}
        <span className="break-normal whitespace-pre-wrap">{text}</span>
      </div>
    )
  },

  link: (block) => {
    const url = block.content?.url || ''
    const label = block.content?.label || url
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:text-primary-dark"
      >
        {label}
      </a>
    )
  },

  image: (block) => {
    const attachmentId = block.content?.attachment_id || ''
    const alt = block.content?.alt || 'Image'
    return (
      <div className="my-2 rounded border">
        <img
          src={`/placeholder.svg?height=200&width=400&text=${encodeURIComponent(alt)}`}
          alt={alt}
          className="rounded w-full h-auto"
        />
        <p className="text-xs text-muted-foreground mt-1">{alt}</p>
      </div>
    )
  },

  file: (block) => {
    const displayName = block.content?.display_name || 'File'
    const attachmentId = block.content?.attachment_id || ''
    return (
      <div className="my-2 flex items-center rounded border p-2">
        <span className="material-icons text-primary mr-2">insert_drive_file</span>
        <span className="break-all">{displayName}</span>
      </div>
    )
  },

  child_page: (block) => {
    const pageId = block.content?.page_id || ''
    return (
      <div className="my-2 p-2 rounded border cursor-pointer hover:bg-border flex items-center gap-2">
        <span className="material-icons">folder</span>
        <span className="break-all">Child Page</span>
      </div>
    )
  },
}

// Render a block for display
export function renderBlock(block: Block): React.ReactNode {
  const renderer = blockRenderers[block.type]
  if (!renderer) {
    // Unknown block type - render placeholder
    return (
      <div className="my-2 p-2 rounded border dashed border-border">
        <span className="text-xs text-muted-foreground">
          {block.type}: unsupported block type
        </span>
      </div>
    )
  }
  return renderer(block)
}

// Create a new block with default content
export function createBlock(
  type: BlockType,
  content: BlockContent = {} as BlockContent,
  position = 0,
  parentBlockId: string | null = null
): Block {
  return {
    id: generateBlockId(),
    page_id: '',
    pageId: '',
    user_id: '',
    userId: '',
    type,
    content,
    position,
    parent_block_id: parentBlockId,
    parentBlockId: parentBlockId,
    schema_version: 1,
    schemaVersion: 1,
    revision: 1,
    created_at: new Date(),
    createdAt: new Date(),
    updated_at: new Date(),
    updatedAt: new Date(),
  }
}

// Get default content for a block type
export function getDefaultContent(type: BlockType): any {
  switch (type) {
    case 'paragraph':
      return { rich_text: [{ text: 'Start writing...', marks: [] }] }
    case 'heading':
      return { level: 2, rich_text: [{ text: 'Heading', marks: [] }] }
    case 'bulleted_list_item':
      return { rich_text: [{ text: 'Item', marks: [] }] }
    case 'numbered_list_item':
      return { rich_text: [{ text: 'Item', marks: [] }] }
    case 'todo':
      return { checked: false, rich_text: [{ text: 'Todo', marks: [] }] }
    case 'quote':
      return { rich_text: [{ text: 'Quote', marks: [] }] }
    case 'code':
      return { text: 'print("Hello, World!")', language: 'text' }
    case 'divider':
      return {}
    case 'callout':
      return { emoji: '💡', rich_text: [{ text: 'Remember this', marks: [] }] }
    case 'link':
      return { url: 'https://', label: 'Link' }
    case 'image':
      return { attachment_id: '', alt: 'Image' }
    case 'file':
      return { attachment_id: '', display_name: 'document.pdf' }
    case 'child_page':
      return { page_id: '' }
    default:
      return {}
  }
}