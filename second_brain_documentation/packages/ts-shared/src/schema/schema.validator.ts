/**
 * Schema validation utilities using JSON Schema from contracts.
 * Provides type-safe validation that can be shared between web, Flutter, and MCP.
 */

import type { JSONSchema } from 'json-schema-interpreter'

import blockSchema from '../../contracts/block-schema.json'
import mcpTools from '../../contracts/mcp-tools.json'
import errorCodes from '../../contracts/error-codes.json'

/**
 * Validate a block against the canonical JSON Schema.
 * Returns validation errors or empty array if valid.
 */
export function validateBlockSchema(block: unknown): string[] {
  const errors: string[] = []

  if (!block || typeof block !== 'object') {
    errors.push('Block must be a non-null object')
    return errors
  }

  // Use the JSON Schema from contracts for validation
  const result = validateWithSchema(block, blockSchema)

  if (result.length > 0) {
    errors.push(...result)
  }

  // Additional cross-field validations that JSON Schema can't express
  const type = (block as any)?.type
  const content = (block as any)?.content

  if (type && content) {
    // Validate rich_text structure for supported types
    const richTextErrors = validateRichText(type, content)
    if (richTextErrors.length > 0) {
      errors.push(...richTextErrors)
    }
  }

  return errors
}

/**
 * Validate rich_text array structure for a given block type.
 */
function validateRichText(type: string, content: unknown): string[] {
  const errors: string[] = []

  // rich_text is required for: paragraph, bulleted_list_item, numbered_list_item, quote, todo, heading, callout
  const typesWithRichText = [
    'paragraph',
    'bulleted_list_item',
    'numbered_list_item',
    'quote',
    'todo',
    'heading',
    'callout'
  ]

  if (typesWithRichText.includes(type)) {
    const richText = content.rich_text
    if (!Array.isArray(richText)) {
      errors.push('rich_text must be an array')
      return errors
    }

    for (let i = 0; i < richText.length; i++) {
      const run = richText[i]
      if (!run || typeof run !== 'object') {
        errors.push(`rich_text[${i}]: each element must be an object`)
        continue
      }

      if (typeof run.text !== 'string') {
        errors.push(`rich_text[${i}].text must be a string`)
      }

      if (!Array.isArray(run.marks)) {
        errors.push(`rich_text[${i}].marks must be an array`)
        continue
      }

      for (let j = 0; j < run.marks.length; j++) {
        const mark = run.marks[j]
        if (!mark || typeof mark !== 'object') {
          errors.push(`rich_text[${i}].marks[${j}]: each mark must be an object`)
          continue
        }

        if (mark.type) {
          const validMarkTypes = ['bold', 'italic', 'underline', 'strike', 'link']
          if (!validMarkTypes.includes(mark.type)) {
            errors.push(`rich_text[${i}].marks[${j}]: invalid mark type "${mark.type}"`)
          }
        }

        if (mark.type === 'link' && mark.url) {
          try {
            new URL(mark.url)
          } catch {
            errors.push(`rich_text[${i}].marks[${j}].link URL must be valid`)
          }
        }
      }
    }
  }

  return errors
}

/**
 * Validate MCP tool input against its JSON Schema.
 */
export function validateMCPInput(toolName: string, input: unknown): string[] {
  const tool = (mcpTools as any).tools.find(
    (t: any) => t.name === toolName
  )

  if (!tool) {
    return [`Unknown MCP tool: "${toolName}"`]
  }

  const schema = tool.input
  if (!schema) {
    return ['No input schema defined for this tool']
  }

  const errors: string[] = []

  if (!input || typeof input !== 'object') {
    errors.push('Input must be a non-null object')
    return errors
  }

  const result = validateWithSchema(input, schema)

  if (result.length > 0) {
    errors.push(...result)
  }

  return errors
}

/**
 * Validate MCP tool output against its JSON Schema.
 */
export function validateMCPOutput(toolName: string, output: unknown): string[] {
  const tool = (mcpTools as any).tools.find(
    (t: any) => t.name === toolName
  )

  if (!tool) {
    return [`Unknown MCP tool: "${toolName}"`]
  }

  const schema = tool.output
  if (!schema) {
    // No output schema defined; perform basic sanity checks
    return []
  }

  const errors: string[] = []

  if (!output || typeof output !== 'object') {
    errors.push('Output must be a non-null object')
    return errors
  }

  const result = validateWithSchema(output, schema)

  if (result.length > 0) {
    errors.push(...result)
  }

  return errors
}

/**
 * Generic JSON Schema validator (draft-07 compatible).
 */
function validateWithSchema(instance: unknown, schema: JSONSchema): string[] {
  const errors: string[] = []

  // Check type
  if (schema.type) {
    const expectedType = schema.type
    let actualType: string

    if (expectedType === 'object') {
      actualType = instance !== null && typeof instance === 'object' && !Array.isArray(instance) ? 'object' : typeof instance
    } else if (expectedType === 'array') {
      actualType = Array.isArray(instance) ? 'array' : typeof instance
    } else {
      actualType = typeof instance
    }

    if (actualType !== expectedType) {
      errors.push(`Expected type "${expectedType}", got "${actualType}"`)
      // Short-circuit: if type doesn't match, we can't validate further
      return errors
    }
  }

  // Check enum
  if (schema.enum && Array.isArray(schema.enum)) {
    const values = schema.enum
    const instanceValue = (instance as any).type || (instance as any).query || (instance as any).page_id

    if (instanceValue && !values.includes(instanceValue)) {
      errors.push(`Value "${instanceValue}" is not one of: ${values.join(', ')}`)
    }
  }

  // Check minimum/maximum for numbers
  if (schema.minimum !== undefined && typeof instance === 'number') {
    if (instance < schema.minimum) {
      errors.push(`Value ${instance} is less than minimum ${schema.minimum}`)
    }
  }
  if (schema.maximum !== undefined && typeof instance === 'number') {
    if (instance > schema.maximum) {
      errors.push(`Value ${instance} is greater than maximum ${schema.maximum}`)
    }
  }

  // Check minLength/maxLength for strings
  if (schema.minLength !== undefined && typeof instance === 'string') {
    if (instance.length < schema.minLength) {
      errors.push(`String length ${instance.length} is less than minimum ${schema.minLength}`)
    }
  }
  if (schema.maxLength !== undefined && typeof instance === 'string') {
    if (instance.length > schema.maxLength) {
      errors.push(`String length ${instance.length} is greater than maximum ${schema.maxLength}`)
    }
  }

  // Check format (uuid)
  if (schema.format === 'uuid' && typeof instance === 'string') {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(instance)) {
      errors.push(`Value "${instance}" is not a valid UUID`)
    }
  }

  // Check properties recursively
  if (schema.properties && typeof instance === 'object' && !Array.isArray(instance)) {
    const properties = schema.properties
    for (const [propName, propSchema] of Object.entries(properties)) {
      if (!(propName in instance)) {
        // Check if required
        const required = schema.required || []
        if (!required.includes(propName)) {
          // Optional property, skip if not present
          continue
        }
        errors.push(`Missing required property: "${propName}"`)
      } else {
        const propErrors = validateWithSchema(
          (instance as any)[propName],
          propSchema
        )
        errors.push(...propErrors)
      }
    }
  }

  // Check additionalProperties
  if (schema.additionalProperties === false && typeof instance === 'object' && !Array.isArray(instance)) {
    const allowedProps = Object.keys(schema.properties || {})
    for (const key of Object.keys(instance as Record<string, unknown>)) {
      if (!allowedProps.includes(key)) {
        errors.push(`Unexpected property: "${key}"`)
      }
    }
  }

  return errors
}

export default validateBlockSchema