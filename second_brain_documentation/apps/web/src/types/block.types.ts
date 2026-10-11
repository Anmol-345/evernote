/**
 * Canonical block types as defined in the shared block schema.
 * These types match the JSON Schema in contracts/block-schema.json
 */

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'todo'
  | 'quote'
  | 'code'
  | 'divider'
  | 'callout'
  | 'link'
  | 'image'
  | 'file'
  | 'child_page'

export interface RichTextRun {
  text: string
  marks?: RichTextMark[]
}

export type RichTextMark =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'link'
  | { type: string; [key: string]: any }

export interface RichText {
  runs?: RichTextRun[]
  [key: string]: any
}

export interface BlockContent {
  type?: BlockType
  rich_text?: RichText | RichTextRun[] | any
  level?: 1 | 2 | 3
  checked?: boolean
  text?: string
  language?: string
  emoji?: string
  url?: string
  label?: string
  attachment_id?: string
  alt?: string
  display_name?: string
  page_id?: string
  [key: string]: any
}

export interface Block {
  id: string
  page_id?: string
  pageId?: string
  user_id?: string
  userId?: string
  type: BlockType
  content: BlockContent
  position: number
  parent_block_id?: string | null
  parentBlockId?: string | null
  schema_version?: number
  schemaVersion?: number
  revision?: number
  created_at?: string | Date
  createdAt?: string | Date
  updated_at?: string | Date
  updatedAt?: string | Date
  [key: string]: any
}

export interface Page {
  id: string
  user_id: string
  parent_id?: string | null
  title: string
  icon?: string | null
  cover_path?: string | null
  archived_at?: string | null
  deleted_at?: string | null
  revision: number
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  normalized_name: string
}

export interface PageTag {
  page_id: string
  tag_id: string
}

export interface Favorite {
  user_id: string
  page_id: string
}

export interface Attachment {
  id: string
  user_id: string
  page_id?: string | null
  storage_path: string
  filename: string
  content_type?: string | null
  size_bytes: number
  checksum?: string | null
  created_at: string
  deleted_at?: string | null
}

export interface SearchResult {
  id?: string
  page_id?: string
  title: string
  snippet?: string
  preview?: string
  matching_block_id?: string | null
  updated_at?: string
}

export interface SearchResponse {
  results: SearchResult[]
  total?: number
  query?: string
  next_cursor?: string
}

export interface GetPageResponse {
  page: Page
  blocks: Block[]
}
