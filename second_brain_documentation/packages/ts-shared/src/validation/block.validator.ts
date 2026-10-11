import draftValidate from 'jsonschema' // Will use a simple validator

import blockSchema from '../contracts/block-schema.json'

/**
 * Validate a block against the canonical block schema.
 * Returns an array of validation errors, or empty if valid.
 */
export function validateBlock(block: unknown): string[] {
  const errors: string[] = []

  if (!block || typeof block !== 'object') {
    errors.push('Block must be a non-null object')
    return errors
  }

  // Check required fields
  if (!('type' in block) || typeof (block as any).type !== 'string') {
    errors.push('Block must have a "type" field of type string')
  } else if (!isValidBlockType((block as any).type)) {
    errors.push(`Invalid block type: "${(block as any).type}". Must be one of: ${getValidBlockTypes().join(', ')}`)
  }

  if (!('content' in block) || typeof (block as any).content !== 'object') {
    errors.push('Block must have a "content" field of type object')
  }

  if (!('id' in block) || typeof (block as any).id !== 'string') {
    errors.push('Block must have an "id" field of type string (UUID)')
  }

  if (!('page_id' in block) || typeof (block as any).page_id !== 'string') {
    errors.push('Block must have a "page_id" field of type string (UUID)')
  }

  if (!('position' in block) || typeof (block as any).position !== 'number') {
    errors.push('Block must have a "position" field of type number')
  } else if ((block as any).position < 0) {
    errors.push('Block position must be >= 0')
  }

  if (!('schema_version' in block) || typeof (block as any).schema_version !== 'number') {
    errors.push('Block must have a "schema_version" field of type number')
  } else if ((block as any).schema_version < 1) {
    errors.push('Block schema_version must be >= 1')
  }

  if (!('revision' in block) || typeof (block as any).revision !== 'number') {
    errors.push('Block must have a "revision" field of type number')
  } else if ((block as any).revision < 1) {
    errors.push('Block revision must be >= 1')
  }

  // Validate parent_block_id if present
  if ('parent_block_id' in block && (block as any).parent_block_id !== null && typeof (block as any).parent_block_id !== 'string') {
    errors.push('Block parent_block_id must be null or a string (UUID)')
  }

  // Schema-level validation for content based on block type
  const type = (block as any).type
  const content = (block as any).content

  if (content && typeof content === 'object') {
    validateContentByType(type, content, errors)
  }

  return errors
}

/**
 * Check if a block type is valid according to the schema.
 */
function isValidBlockType(type: string): boolean {
  const validTypes = getValidBlockTypes()
  return validTypes.includes(type)
}

/**
 * Get the list of valid block types.
 */
function getValidBlockTypes(): BlockType[] {
  return [
    'paragraph',
    'heading',
    'bulleted_list_item',
    'numbered_list_item',
    'todo',
    'quote',
    'code',
    'divider',
    'callout',
    'link',
    'image',
    'file',
    'child_page'
  ] as BlockType[]
}

/**
 * Validate content structure based on block type.
 */
function validateContentByType(
  type: string,
  content: unknown,
  errors: string[]
): void {
  if (!content || typeof content !== 'object') {
    errors.push('Block content must be an object')
    return
  }

  switch (type) {
    case 'heading': {
      const c = content as { level?: number; rich_text?: unknown }
      if (c.level === undefined) {
        errors.push('Heading content must have a "level" field (1-3)')
      } else if (c.level < 1 || c.level > 3) {
        errors.push('Heading level must be between 1 and 3')
      }
      if (!c.rich_text || !Array.isArray(c.rich_text)) {
        errors.push('Heading content must have a "rich_text" array')
      }
      break
    }
    case 'paragraph':
    case 'bulleted_list_item':
    case 'numbered_list_item':
    case 'quote': {
      const c = content as { rich_text?: unknown }
      if (!c.rich_text || !Array.isArray(c.rich_text)) {
        errors.push(`${type} content must have a "rich_text" array`)
      }
      break
    }
    case 'todo': {
      const c = content as { checked?: boolean; rich_text?: unknown }
      if (c.checked === undefined) {
        errors.push('Todo content must have a "checked" field')
      }
      if (!c.rich_text || !Array.isArray(c.rich_text)) {
        errors.push('Todo content must have a "rich_text" array')
      }
      break
    }
    case 'code': {
      const c = content as { text?: string; language?: string }
      if (!c.text || typeof c.text !== 'string') {
        errors.push('Code content must have a "text" field of type string')
      }
      break
    }
    case 'divider': {
      // divider has empty content
      if (Object.keys(content).length > 0) {
        errors.push('Divider content must be an empty object')
      }
      break
    }
    case 'callout': {
      const c = content as { emoji?: string; rich_text?: unknown }
      if (!c.rich_text || !Array.isArray(c.rich_text)) {
        errors.push('Callout content must have a "rich_text" array')
      }
      if (c.emoji && typeof c.emoji !== 'string') {
        errors.push('Callout emoji must be a string if provided')
      }
      break
    }
    case 'link': {
      const c = content as { url?: string; label?: string }
      if (!c.url || typeof c.url !== 'string') {
        errors.push('Link content must have a "url" field of type string')
      }
      if (!c.label || typeof c.label !== 'string') {
        errors.push('Link content must have a "label" field of type string')
      }
      // Validate URL scheme
      try {
        new URL(c.url)
      } catch {
        errors.push('Link URL must be a valid URI')
      }
      break
    }
    case 'image': {
      const c = content as { attachment_id?: string; alt?: string; display_name?: string }
      if (!c.attachment_id || typeof c.attachment_id !== 'string') {
        errors.push('Image content must have an "attachment_id" field of type string (UUID)')
      }
      if (!c.alt || typeof c.alt !== 'string') {
        errors.push('Image content must have an "alt" field of type string')
      }
      break
    }
    case 'file': {
      const c = content as { attachment_id?: string; display_name?: string }
      if (!c.attachment_id || typeof c.attachment_id !== 'string') {
        errors.push('File content must have an "attachment_id" field of type string (UUID)')
      }
      if (!c.display_name || typeof c.display_name !== 'string') {
        errors.push('File content must have a "display_name" field of type string')
      }
      break
    }
    case 'child_page': {
      const c = content as { page_id?: string }
      if (!c.page_id || typeof c.page_id !== 'string') {
        errors.push('Child page content must have a "page_id" field of type string (UUID)')
      }
      break
    }
    default:
      // Unknown type - we allow additionalProperties but still validate basics
      break
  }
}

export default validateBlock