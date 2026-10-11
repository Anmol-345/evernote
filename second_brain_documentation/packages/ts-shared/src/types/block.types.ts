/**
 * Canonical block types as defined in the shared block schema.
 * These types must match the JSON Schema in contracts/block-schema.json
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
  marks: RichTextMark[]
}

export type RichTextMark =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'link'

export interface RichText {
  runs: RichTextRun[]
}

export interface BlockContentBase {
  rich_text?: RichText
}

export interface ParagraphContent extends BlockContentBase {
  type: 'paragraph'
  rich_text: RichText
}

export interface HeadingContent extends BlockContentBase {
  type: 'heading'
  level: 1 | 2 | 3
  rich_text: RichText
}

export interface BulletedListItemContent extends BlockContentBase {
  type: 'bulleted_list_item'
  rich_text: RichText
}

export interface NumberedListItemContent extends BlockContentBase {
  type: 'numbered_list_item'
  rich_text: RichText
}

export interface TodoContent extends BlockContentBase {
  type: 'todo'
  checked: boolean
  rich_text: RichText
}

export interface QuoteContent extends BlockContentBase {
  type: 'quote'
  rich_text: RichText
}

export interface CodeContent {
  type: 'code'
  text: string
  language?: string
}

export interface DividerContent {
  type: 'divider'
}

export interface CalloutContent {
  type: 'callout'
  emoji?: string
  rich_text: RichText
}

export interface LinkContent {
  type: 'link'
  url: string
  label: string
}

export interface ImageContent {
  type: 'image'
  attachment_id: string
  alt: string
}

export interface FileContent {
  type: 'file'
  attachment_id: string
  display_name: string
}

export interface ChildPageContent {
  type: 'child_page'
  page_id: string
}

export type BlockContent =
  | ParagraphContent
  | HeadingContent
  | BulletedListItemContent
  | NumberedListItemContent
  | TodoContent
  | QuoteContent
  | CodeContent
  | DividerContent
  | CalloutContent
  | LinkContent
  | ImageContent
  | FileContent
  | ChildPageContent

export interface Block {
  id: string
  page_id: string
  user_id: string
  type: BlockType
  content: BlockContent
  position: number
  parent_block_id?: string | null
  schema_version: number
  revision: number
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
  page_id: string
  title: string
  snippet: string
  matching_block_id?: string | null
  updated_at: string
}

export interface SearchResponse {
  results: SearchResult[]
  next_cursor?: string
}

export interface GetPageResponse {
  page: Page
  blocks: Block[]
}