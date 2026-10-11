/**
 * Second Brain MCP Server
 * 
 * Exposes a controlled set of knowledge-base operations to AI agents.
 * Enforces Bearer token authentication, user-scoped RLS authorization,
 * input schema validation, revision-conflict protection, idempotency,
 * and audit logging.
 * 
 * Transport: Streamable HTTP & JSON-RPC 2.0 compatible, plus REST endpoints.
 */

import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Auto-load .env.local or .env if present
for (const envName of ['.env.local', '.env']) {
  const envPath = path.resolve(__dirname, envName)
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=')
        const k = trimmed.slice(0, idx).trim()
        const v = trimmed.slice(idx + 1).trim()
        if (!process.env[k]) process.env[k] = v
      }
    }
    break
  }
}

// ==========================================
// Configuration & Schema Loading
// ==========================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kmbkfbiebstmujnwtgdx.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttYmtmYmllYnN0bXVqbnd0Z2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzkwMzMsImV4cCI6MjEwNzMxNTAzM30.ouFKeYbMJTGp4-Hduc7IVQL3UJNfPwY17jRcKCvjoFc'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const PORT = process.env.MCP_PORT || process.env.PORT || 3001

// Global client for token verification
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefresh: false, persistSession: false }
})

// Load tool schemas and block schemas
function loadJsonFile(relPath) {
  const fullPath = path.resolve(__dirname, relPath)
  if (fs.existsSync(fullPath)) {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'))
  }
  return null
}

const mcpToolsCatalog = loadJsonFile('../../contracts/mcp-tools.json') || 
                        loadJsonFile('../contracts/mcp-tools.json') || 
                        { tools: [] }

const blockSchemaDefinition = loadJsonFile('../../contracts/block-schema.json') || 
                              loadJsonFile('../contracts/block-schema.json') || 
                              {}

// ==========================================
// Error Codes
// ==========================================

const ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  TOO_LARGE: 'TOO_LARGE',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
}

function makeError(code, message, details = null, retryable = false) {
  return {
    error: {
      code,
      message,
      details,
      retryable,
      requestId: crypto.randomUUID()
    }
  }
}

// ==========================================
// Validation Helpers
// ==========================================

function validateMCPInput(toolName, input) {
  const tool = mcpToolsCatalog.tools.find(t => t.name === toolName)
  if (!tool) return [`Unknown MCP tool: ${toolName}`]
  if (!input || typeof input !== 'object') return ['Input must be a JSON object']

  const errors = []
  const schema = tool.input
  if (schema && schema.required) {
    for (const reqField of schema.required) {
      if (input[reqField] === undefined || input[reqField] === null || input[reqField] === '') {
        errors.push(`Missing required field: ${reqField}`)
      }
    }
  }
  return errors
}

function validateBlockSchema(block) {
  const errors = []
  if (!block || typeof block !== 'object') {
    return ['Block must be an object']
  }
  if (!block.type || typeof block.type !== 'string') {
    errors.push('Block must have a string type')
  }
  if (!block.content || typeof block.content !== 'object') {
    errors.push('Block must have an object content')
  }
  return errors
}

// ==========================================
// Bearer Token Authentication Middleware
// ==========================================

async function authenticateBearerToken(req, res, next) {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json(makeError(
      ERROR_CODES.UNAUTHENTICATED,
      'Missing or malformed Authorization Bearer token header'
    ))
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return res.status(401).json(makeError(
      ERROR_CODES.UNAUTHENTICATED,
      'Bearer token is empty'
    ))
  }

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json(makeError(
        ERROR_CODES.UNAUTHENTICATED,
        'Invalid or expired Bearer token'
      ))
    }

    // Attach user and create user-scoped client that enforces RLS
    req.user = data.user
    req.token = token
    req.userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefresh: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    next()
  } catch (err) {
    console.error('Auth verification error:', err)
    return res.status(500).json(makeError(ERROR_CODES.INTERNAL_ERROR, 'Authentication verification failed'))
  }
}

// Optional audit log helper
async function recordAudit(client, actorId, operation, outcome, targetPageId = null, targetBlockId = null, idempotencyHash = null, errorCode = null) {
  try {
    await client.rpc('record_agent_operation', {
      p_actor_id: actorId || 'mcp-agent',
      p_operation: operation,
      p_outcome: outcome,
      p_request_id: crypto.randomUUID(),
      p_idempotency_key_hash: idempotencyHash,
      p_target_page_id: targetPageId,
      p_target_block_id: targetBlockId,
      p_error_code: errorCode
    })
  } catch (e) {
    // Non-fatal audit log warning
    console.warn('Audit record warning:', e.message)
  }
}

// ==========================================
// Tool Implementation Functions
// ==========================================

async function executeSearchPages(client, userId, input) {
  const { query, tag_ids, limit = 50, cursor } = input
  let qb = client.from('pages').select('id, title, updated_at, revision, archived_at')
  if (query && query.trim()) {
    qb = qb.ilike('title', `%${query.trim()}%`)
  }
  qb = qb.is('deleted_at', null).order('updated_at', { ascending: false }).limit(Math.min(limit, 100))

  const { data, error } = await qb
  if (error) throw error

  return {
    results: (data || []).map(p => ({
      page_id: p.id,
      title: p.title,
      snippet: '',
      updated_at: p.updated_at,
      revision: p.revision
    })),
    next_cursor: undefined
  }
}

async function executeGetPage(client, userId, input) {
  const { page_id, include_blocks = true } = input
  const { data: page, error: pageErr } = await client
    .from('pages')
    .select('*')
    .eq('id', page_id)
    .single()

  if (pageErr || !page) {
    const err = new Error('Page not found or access denied')
    err.code = ERROR_CODES.NOT_FOUND
    throw err
  }

  let blocks = []
  if (include_blocks) {
    const { data: blockData, error: bErr } = await client
      .from('blocks')
      .select('*')
      .eq('page_id', page_id)
      .order('position')
    if (bErr) throw bErr
    blocks = blockData || []
  }

  return { page, blocks }
}

async function executeListChildren(client, userId, input) {
  const { parent_page_id, limit = 50, cursor } = input
  let qb = client.from('pages').select('id, title, parent_id, icon, revision, updated_at')
  if (parent_page_id) {
    qb = qb.eq('parent_id', parent_page_id)
  } else {
    qb = qb.is('parent_id', null)
  }
  qb = qb.is('deleted_at', null).order('created_at', { ascending: false }).limit(Math.min(limit, 100))

  const { data, error } = await qb
  if (error) throw error

  return {
    children: (data || []).map(p => ({
      page_id: p.id,
      title: p.title,
      parent_id: p.parent_id,
      icon: p.icon,
      revision: p.revision,
      updated_at: p.updated_at
    })),
    next_cursor: undefined
  }
}

async function executeCreatePage(client, userId, input) {
  const { title, parent_page_id, icon, idempotency_key } = input

  // Check parent ownership if parent provided
  if (parent_page_id) {
    const { data: parent, error: pErr } = await client
      .from('pages')
      .select('id')
      .eq('id', parent_page_id)
      .single()
    if (pErr || !parent) {
      const err = new Error('Parent page not found or access denied')
      err.code = ERROR_CODES.NOT_FOUND
      throw err
    }
  }

  let idempHash = null
  if (idempotency_key) {
    idempHash = crypto.createHash('sha256').update(String(idempotency_key)).digest('hex')
    const { data: existingOp } = await client
      .from('agent_operations')
      .select('target_page_id')
      .eq('idempotency_key_hash', idempHash)
      .eq('outcome', 'SUCCESS')
      .maybeSingle()
    if (existingOp && existingOp.target_page_id) {
      const { data: cachedPage } = await client
        .from('pages')
        .select('*')
        .eq('id', existingOp.target_page_id)
        .maybeSingle()
      if (cachedPage) {
        return { page: cachedPage, created: false, deduplicated: true }
      }
    }
  }

  const { data: newPage, error: createErr } = await client
    .from('pages')
    .insert({
      title,
      user_id: userId,
      parent_id: parent_page_id || null,
      icon: icon || null
    })
    .select()
    .single()

  if (createErr) throw createErr

  if (idempHash) {
    await recordAudit(client, 'mcp', 'create_page', 'SUCCESS', newPage.id, null, idempHash)
  }

  return { page: newPage, created: true }
}

async function executeUpdatePage(client, userId, input) {
  const { page_id, title, icon, expected_revision } = input
  const { data: curr, error: fetchErr } = await client
    .from('pages')
    .select('revision')
    .eq('id', page_id)
    .single()

  if (fetchErr || !curr) {
    const err = new Error('Page not found or access denied')
    err.code = ERROR_CODES.NOT_FOUND
    throw err
  }

  if (expected_revision !== undefined && curr.revision !== expected_revision) {
    const err = new Error('Stale revision: the page has been modified since last view')
    err.code = ERROR_CODES.CONFLICT
    err.details = { current_revision: curr.revision, expected_revision }
    throw err
  }

  const updateData = {}
  if (title !== undefined) updateData.title = title
  if (icon !== undefined) updateData.icon = icon

  let qb = client.from('pages').update(updateData).eq('id', page_id)
  if (expected_revision !== undefined) {
    qb = qb.eq('revision', expected_revision)
  }

  const { data: updated, error: updErr } = await qb.select().single()
  if (updErr || !updated) {
    const err = new Error('Page update conflict or access denied')
    err.code = ERROR_CODES.CONFLICT
    throw err
  }

  return { page: updated }
}

async function executeAppendBlocks(client, userId, input) {
  const { page_id, blocks, expected_revision, idempotency_key } = input
  const { data: page, error: pageErr } = await client
    .from('pages')
    .select('revision')
    .eq('id', page_id)
    .single()

  if (pageErr || !page) {
    const err = new Error('Page not found or access denied')
    err.code = ERROR_CODES.NOT_FOUND
    throw err
  }

  if (expected_revision !== undefined && page.revision !== expected_revision) {
    const err = new Error('Stale revision: the page has been modified')
    err.code = ERROR_CODES.CONFLICT
    err.details = { current_revision: page.revision, expected_revision }
    throw err
  }

  for (const b of blocks) {
    const vErrors = validateBlockSchema(b)
    if (vErrors.length > 0) {
      const err = new Error('Invalid block schema: ' + vErrors.join(', '))
      err.code = ERROR_CODES.VALIDATION_ERROR
      throw err
    }
  }

  // Get current highest position
  const { data: existingBlocks } = await client
    .from('blocks')
    .select('position')
    .eq('page_id', page_id)
    .order('position', { ascending: false })
    .limit(1)

  const startPos = (existingBlocks && existingBlocks.length > 0) ? existingBlocks[0].position + 1 : 0

  const toInsert = blocks.map((b, i) => ({
    id: crypto.randomUUID(),
    page_id,
    user_id: userId,
    type: b.type,
    content: b.content || {},
    position: startPos + i,
    parent_block_id: b.parent_block_id || null,
    schema_version: 1,
    revision: 1
  }))

  const { data: inserted, error: insErr } = await client
    .from('blocks')
    .insert(toInsert)
    .select()

  if (insErr) throw insErr

  // Increment page revision
  const { data: updatedPage } = await client
    .from('pages')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', page_id)
    .select('revision')
    .single()

  return {
    created_block_ids: (inserted || []).map(b => b.id),
    page_revision: updatedPage?.revision || (page.revision + 1)
  }
}

async function executeUpdateBlock(client, userId, input) {
  const { block_id, content, expected_revision } = input
  const { data: curr, error: fetchErr } = await client
    .from('blocks')
    .select('revision, type')
    .eq('id', block_id)
    .single()

  if (fetchErr || !curr) {
    const err = new Error('Block not found or access denied')
    err.code = ERROR_CODES.NOT_FOUND
    throw err
  }

  if (expected_revision !== undefined && curr.revision !== expected_revision) {
    const err = new Error('Stale revision: the block has been modified')
    err.code = ERROR_CODES.CONFLICT
    err.details = { current_revision: curr.revision, expected_revision }
    throw err
  }

  let qb = client.from('blocks').update({ content }).eq('id', block_id)
  if (expected_revision !== undefined) {
    qb = qb.eq('revision', expected_revision)
  }

  const { data: updated, error: updErr } = await qb.select().single()
  if (updErr || !updated) {
    const err = new Error('Block update conflict')
    err.code = ERROR_CODES.CONFLICT
    throw err
  }

  return { block: updated }
}

async function executeMoveBlock(client, userId, input) {
  const { block_id, target_page_id, target_parent_block_id, position, expected_revision } = input
  const { data: curr, error: fetchErr } = await client
    .from('blocks')
    .select('revision, page_id')
    .eq('id', block_id)
    .single()

  if (fetchErr || !curr) {
    const err = new Error('Block not found or access denied')
    err.code = ERROR_CODES.NOT_FOUND
    throw err
  }

  if (expected_revision !== undefined && curr.revision !== expected_revision) {
    const err = new Error('Stale revision')
    err.code = ERROR_CODES.CONFLICT
    throw err
  }

  // Validate target page ownership
  const targetPage = target_page_id || curr.page_id
  const { data: pageOk, error: pErr } = await client
    .from('pages')
    .select('id')
    .eq('id', targetPage)
    .single()
  if (pErr || !pageOk) {
    const err = new Error('Target page not found or access denied')
    err.code = ERROR_CODES.NOT_FOUND
    throw err
  }

  const updateData = {
    page_id: targetPage,
    position: position !== undefined ? position : 0,
    parent_block_id: target_parent_block_id || null
  }

  let qb = client.from('blocks').update(updateData).eq('id', block_id)
  if (expected_revision !== undefined) {
    qb = qb.eq('revision', expected_revision)
  }

  const { data: moved, error: mErr } = await qb.select().single()
  if (mErr || !moved) {
    const err = new Error('Failed to move block')
    err.code = ERROR_CODES.INTERNAL_ERROR
    throw err
  }

  return { block: moved }
}

async function executeAddTags(client, userId, input) {
  const { page_id, tags } = input
  const { data: page, error: pErr } = await client
    .from('pages')
    .select('id')
    .eq('id', page_id)
    .single()
  if (pErr || !page) {
    const err = new Error('Page not found or access denied')
    err.code = ERROR_CODES.NOT_FOUND
    throw err
  }

  const normalizedTags = (tags || []).map(t => String(t).trim().toLowerCase()).filter(Boolean)
  const tagIds = []

  for (const tagName of normalizedTags) {
    const { data: existingTag } = await client
      .from('tags')
      .select('id')
      .eq('normalized_name', tagName)
      .maybeSingle()

    let tagId = existingTag?.id
    if (!tagId) {
      const { data: newTag, error: tagInsErr } = await client
        .from('tags')
        .insert({ name: tagName, user_id: userId })
        .select()
        .single()
      if (tagInsErr) throw tagInsErr
      tagId = newTag.id
    }
    tagIds.push(tagId)

    // Link in page_tags
    await client
      .from('page_tags')
      .insert({ page_id, tag_id: tagId, user_id: userId })
      .select()
      .maybeSingle()
  }

  return { page_id, tag_ids: tagIds, normalized_tags: normalizedTags }
}

async function executeArchivePage(client, userId, input) {
  const { page_id, expected_revision, include_descendants } = input
  const { data: page, error: pErr } = await client
    .from('pages')
    .select('revision')
    .eq('id', page_id)
    .single()

  if (pErr || !page) {
    const err = new Error('Page not found or access denied')
    err.code = ERROR_CODES.NOT_FOUND
    throw err
  }

  if (expected_revision !== undefined && page.revision !== expected_revision) {
    const err = new Error('Stale revision: the page has been modified')
    err.code = ERROR_CODES.CONFLICT
    throw err
  }

  const archiveTime = new Date().toISOString()
  let qb = client.from('pages').update({ archived_at: archiveTime }).eq('id', page_id)
  if (expected_revision !== undefined) {
    qb = qb.eq('revision', expected_revision)
  }

  const { data: archived, error: archErr } = await qb.select().single()
  if (archErr || !archived) {
    const err = new Error('Failed to archive page')
    err.code = ERROR_CODES.INTERNAL_ERROR
    throw err
  }

  let affectedCount = 1
  if (include_descendants) {
    const { data: children } = await client
      .from('pages')
      .update({ archived_at: archiveTime })
      .eq('parent_id', page_id)
      .select('id')
    if (children) affectedCount += children.length
  }

  return {
    page_id,
    archived_at: archiveTime,
    affected_count: affectedCount
  }
}

// Tool dispatcher mapping
const TOOL_HANDLERS = {
  search_pages: executeSearchPages,
  get_page: executeGetPage,
  list_children: executeListChildren,
  create_page: executeCreatePage,
  update_page: executeUpdatePage,
  append_blocks: executeAppendBlocks,
  update_block: executeUpdateBlock,
  move_block: executeMoveBlock,
  add_tags: executeAddTags,
  archive_page: executeArchivePage
}

// ==========================================
// Express Application Setup
// ==========================================

const app = express()
app.use(express.json({ limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`)
    }
  })
  next()
})

// Health and discovery endpoints (public)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Second Brain MCP Server'
  })
})

app.get('/', (_req, res) => {
  res.json({
    name: 'Second Brain MCP Server',
    version: '1.0.0',
    description: 'Model Context Protocol (MCP) server for Second Brain PKM backend',
    transport: ['Streamable HTTP', 'JSON-RPC 2.0', 'REST'],
    tools: Object.keys(TOOL_HANDLERS)
  })
})

// ==========================================
// Streamable HTTP & JSON-RPC 2.0 Endpoint
// ==========================================

// Streamable SSE endpoint for MCP
app.get(['/mcp/sse', '/sse'], (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const endpointId = crypto.randomUUID()
  res.write(`event: endpoint\ndata: /mcp?session_id=${endpointId}\n\n`)

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n')
  }, 15000)

  req.on('close', () => {
    clearInterval(heartbeat)
  })
})

// Streamable JSON-RPC 2.0 message handler
app.post(['/mcp', '/'], async (req, res) => {
  const body = req.body
  if (!body || body.jsonrpc !== '2.0') {
    // If it's a plain REST call to /mcp without jsonrpc, send help
    return res.status(400).json(makeError(ERROR_CODES.VALIDATION_ERROR, 'Expected JSON-RPC 2.0 request'))
  }

  const { id, method, params } = body

  // Public methods: initialize, notifications/initialized, ping
  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: false }
        },
        serverInfo: {
          name: 'second-brain-mcp',
          version: '1.0.0'
        }
      }
    })
  }

  if (method === 'notifications/initialized' || method === 'ping') {
    return res.json({ jsonrpc: '2.0', id, result: {} })
  }

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: mcpToolsCatalog.tools.map(t => ({
          name: t.name,
          description: t.description || `Tool: ${t.name}`,
          inputSchema: t.input
        }))
      }
    })
  }

  if (method === 'tools/call') {
    // Authenticate Bearer token for tool execution
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32001,
          message: 'UNAUTHENTICATED: Missing Bearer token'
        }
      })
    }

    const token = authHeader.slice(7).trim()
    const { data: authData, error: authErr } = await supabaseAuth.auth.getUser(token)
    if (authErr || !authData?.user) {
      return res.status(401).json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32001,
          message: 'UNAUTHENTICATED: Invalid or expired Bearer token'
        }
      })
    }

    const user = authData.user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefresh: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const toolName = params?.name
    const toolArgs = params?.arguments || {}
    const handler = TOOL_HANDLERS[toolName]

    if (!handler) {
      return res.status(404).json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Tool not found: ${toolName}`
        }
      })
    }

    const vErrors = validateMCPInput(toolName, toolArgs)
    if (vErrors.length > 0) {
      return res.status(400).json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'Invalid tool arguments',
          data: vErrors
        }
      })
    }

    try {
      const output = await handler(userClient, user.id, toolArgs)
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2)
            }
          ]
        }
      })
    } catch (err) {
      return res.json({
        jsonrpc: '2.0',
        id,
        isError: true,
        error: {
          code: err.code === ERROR_CODES.CONFLICT ? -32009 : -32000,
          message: err.message,
          data: err.details || null
        }
      })
    }
  }

  return res.status(404).json({
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`
    }
  })
})

// ==========================================
// REST Endpoints (Authenticated)
// ==========================================

Object.keys(TOOL_HANDLERS).forEach(toolName => {
  const handler = TOOL_HANDLERS[toolName]
  app.post(`/mcp/${toolName}`, authenticateBearerToken, async (req, res) => {
    try {
      const input = req.body || {}
      const vErrors = validateMCPInput(toolName, input)
      if (vErrors.length > 0) {
        return res.status(400).json(makeError(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid input',
          vErrors
        ))
      }

      const result = await handler(req.userClient, req.user.id, input)
      return res.json(result)
    } catch (err) {
      if (err.code === ERROR_CODES.NOT_FOUND) {
        return res.status(404).json(makeError(ERROR_CODES.NOT_FOUND, err.message))
      }
      if (err.code === ERROR_CODES.CONFLICT) {
        return res.status(409).json(makeError(ERROR_CODES.CONFLICT, err.message, err.details, true))
      }
      if (err.code === ERROR_CODES.VALIDATION_ERROR) {
        return res.status(400).json(makeError(ERROR_CODES.VALIDATION_ERROR, err.message))
      }
      console.error(`MCP ${toolName} error:`, err)
      return res.status(500).json(makeError(ERROR_CODES.INTERNAL_ERROR, err.message || 'Internal error', null, true))
    }
  })
})

// ==========================================
// Start Server
// ==========================================

export { app }

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Second Brain MCP Server listening on port ${PORT}`)
    console.log(`Health check: http://localhost:${PORT}/health`)
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`)
  })
}

export default app