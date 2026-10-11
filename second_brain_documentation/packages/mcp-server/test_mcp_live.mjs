process.env.NODE_ENV = 'test'
import http from 'node:http'
import { app } from './index.js'
import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://kmbkfbiebstmujnwtgdx.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttYmtmYmllYnN0bXVqbnd0Z2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzkwMzMsImV4cCI6MjEwNzMxNTAzM30.ouFKeYbMJTGp4-Hduc7IVQL3UJNfPwY17jRcKCvjoFc'

const results = []

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    results.push({ test: message, status: 'FAILED' })
    throw new Error(`Assertion failed: ${message}`)
  } else {
    console.log(`✅ PASS: ${message}`)
    results.push({ test: message, status: 'PASSED' })
  }
}

async function request(serverUrl, path, options = {}) {
  const url = `${serverUrl}${path}`
  const res = await fetch(url, options)
  const contentType = res.headers.get('content-type') || ''
  let body = null
  if (contentType.includes('application/json')) {
    body = await res.json()
  } else {
    body = await res.text()
  }
  return { status: res.status, headers: res.headers, body }
}

async function run() {
  console.log('=== Step 1: Start In-Memory MCP Server on Ephemeral Port ===')
  const server = http.createServer(app)
  await new Promise(resolve => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`
  console.log(`Test MCP server running on ${baseUrl}`)

  console.log('\n=== Step 2: Sign in Alice & Bob ===')
  const authClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const { data: aliceAuth } = await authClient.auth.signInWithPassword({
    email: 'alice@secondbrain.test',
    password: 'TestPassword123!Safe'
  })
  const aliceToken = aliceAuth.session.access_token

  const { data: bobAuth } = await authClient.auth.signInWithPassword({
    email: 'bob@secondbrain.test',
    password: 'TestPassword123!Safe'
  })
  const bobToken = bobAuth.session.access_token

  assert(!!aliceToken && !!bobToken, 'Alice and Bob tokens acquired')

  console.log('\n=== Step 3: Test Health & Discovery ===')
  const healthRes = await request(baseUrl, '/health')
  assert(healthRes.status === 200 && healthRes.body.status === 'ok', 'GET /health returns ok')

  const discRes = await request(baseUrl, '/')
  assert(discRes.status === 200 && discRes.body.tools.length === 10, 'GET / discovery lists all 10 tools')

  console.log('\n=== Step 4: Test Bearer Token Enforcement on REST ===')
  // No token
  const noTokenRes = await request(baseUrl, '/mcp/create_page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Unauthenticated Page' })
  })
  assert(noTokenRes.status === 401 && noTokenRes.body.error.code === 'UNAUTHENTICATED', 'Missing token rejected with 401 UNAUTHENTICATED')

  // Bad token
  const badTokenRes = await request(baseUrl, '/mcp/create_page', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer bad_token_12345'
    },
    body: JSON.stringify({ title: 'Unauthenticated Page' })
  })
  assert(badTokenRes.status === 401 && badTokenRes.body.error.code === 'UNAUTHENTICATED', 'Invalid token rejected with 401 UNAUTHENTICATED')

  console.log('\n=== Step 5: Test JSON-RPC 2.0 (Streamable HTTP MCP Transport) ===')
  // JSON-RPC initialize
  const initRes = await request(baseUrl, '/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
  })
  assert(initRes.status === 200 && initRes.body.result.protocolVersion === '2024-11-05', 'JSON-RPC initialize returns protocolVersion')

  // JSON-RPC tools/list
  const listToolsRes = await request(baseUrl, '/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
  })
  assert(listToolsRes.status === 200 && listToolsRes.body.result.tools.length === 10, 'JSON-RPC tools/list returns all 10 tools')

  // JSON-RPC tools/call create_page without token -> 401
  const unauthCallRes = await request(baseUrl, '/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'create_page', arguments: { title: 'Test' } }
    })
  })
  assert(unauthCallRes.status === 401, 'JSON-RPC tools/call requires Bearer token')

  // JSON-RPC tools/call create_page with Alice token
  const idempKey = 'mcp-create-key-' + Date.now()
  const createPageRes = await request(baseUrl, '/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aliceToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'create_page',
        arguments: {
          title: 'Alice MCP Note',
          idempotency_key: idempKey
        }
      }
    })
  })
  assert(createPageRes.status === 200 && !!createPageRes.body.result.content, 'Alice calls create_page via JSON-RPC')
  const createdPageData = JSON.parse(createPageRes.body.result.content[0].text)
  const alicePageId = createdPageData.page.id
  assert(createdPageData.page.title === 'Alice MCP Note' && createdPageData.created === true, 'Created page verified')

  // Idempotency test: repeat exact call with same key
  const repeatCreateRes = await request(baseUrl, '/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aliceToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'create_page',
        arguments: {
          title: 'Alice MCP Note',
          idempotency_key: idempKey
        }
      }
    })
  })
  const repeatPageData = JSON.parse(repeatCreateRes.body.result.content[0].text)
  assert(repeatPageData.deduplicated === true && repeatPageData.page.id === alicePageId, 'Idempotent replay returned deduplicated result')

  // JSON-RPC append_blocks
  const appendRes = await request(baseUrl, '/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aliceToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'append_blocks',
        arguments: {
          page_id: alicePageId,
          expected_revision: 1,
          idempotency_key: 'mcp-append-key-' + Date.now(),
          blocks: [
            {
              type: 'paragraph',
              content: { rich_text: [{ text: 'Created via MCP protocol', marks: [] }] }
            }
          ]
        }
      }
    })
  })
  console.log('appendRes:', JSON.stringify(appendRes, null, 2))
  assert(appendRes.status === 200, 'Alice appends block via MCP protocol')
  const appendData = JSON.parse(appendRes.body.result.content[0].text)
  assert(appendData.created_block_ids.length === 1 && appendData.page_revision >= 2, 'Block appended and page revision bumped')

  console.log('\n=== Step 6: Test Cross-User Isolation on MCP ===')
  // Bob tries to get_page on Alice's page
  const bobGetAlicePage = await request(baseUrl, '/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bobToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'get_page',
        arguments: { page_id: alicePageId }
      }
    })
  })
  assert(bobGetAlicePage.body.isError === true || bobGetAlicePage.body.error, 'Bob is denied access to Alice page on get_page')

  // Bob tries to update Alice's page
  const bobUpdateAlicePage = await request(baseUrl, '/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bobToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'update_page',
        arguments: { page_id: alicePageId, title: 'Hacked Title' }
      }
    })
  })
  assert(bobUpdateAlicePage.body.isError === true || bobUpdateAlicePage.body.error, 'Bob is denied updating Alice page')

  console.log('\n=== Step 7: Test Revision Conflict on update_page ===')
  // Alice tries to update with stale expected_revision = 1 when DB is at revision >= 2
  const staleUpdateRes = await request(baseUrl, '/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aliceToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'update_page',
        arguments: {
          page_id: alicePageId,
          title: 'Stale update',
          expected_revision: 1
        }
      }
    })
  })
  assert(staleUpdateRes.body.isError === true && staleUpdateRes.body.error.code === -32009, 'Stale update rejected with CONFLICT error (-32009)')

  console.log('\n=== Step 8: Test Search via MCP ===')
  const searchRes = await request(baseUrl, '/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aliceToken}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'search_pages',
        arguments: { query: 'MCP Note' }
      }
    })
  })
  const searchData = JSON.parse(searchRes.body.result.content[0].text)
  assert(searchData.results.length >= 1 && searchData.results[0].title.includes('MCP Note'), 'Alice searches via MCP and finds her note')

  server.close()
  console.log('\n=============================================')
  console.log(`🎉 ALL ${results.length} MCP SERVER TESTS PASSED!`)
  console.log('=============================================')
  process.exit(0)
}

run().catch(err => {
  console.error('Test run failed:', err)
  process.exit(1)
})
