import { createClient } from '../../packages/mcp-server/node_modules/@supabase/supabase-js/dist/index.mjs'

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

async function run() {
  console.log('=== Step 1: Sign in Alice and Bob ===')
  const authClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })

  const { data: aliceAuth, error: aliceAuthErr } = await authClient.auth.signInWithPassword({
    email: 'alice@secondbrain.test',
    password: 'TestPassword123!Safe'
  })
  assert(!aliceAuthErr && !!aliceAuth.session, 'Alice signs in successfully')
  const aliceToken = aliceAuth.session.access_token
  const aliceId = aliceAuth.user.id

  const { data: bobAuth, error: bobAuthErr } = await authClient.auth.signInWithPassword({
    email: 'bob@secondbrain.test',
    password: 'TestPassword123!Safe'
  })
  assert(!bobAuthErr && !!bobAuth.session, 'Bob signs in successfully')
  const bobToken = bobAuth.session.access_token
  const bobId = bobAuth.user.id

  console.log(`Alice ID: ${aliceId}`)
  console.log(`Bob ID: ${bobId}`)

  // Create scoped clients
  const aliceClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${aliceToken}` } }
  })

  const bobClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${bobToken}` } }
  })

  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false }
  })

  console.log('\n=== Step 2: Profiles RLS & Triggers ===')
  // Alice views profiles: should only see Alice
  const { data: aliceProfiles } = await aliceClient.from('profiles').select('*')
  assert(aliceProfiles.length === 1 && aliceProfiles[0].id === aliceId, 'Alice sees only her own profile')

  // Bob views profiles: should only see Bob
  const { data: bobProfiles } = await bobClient.from('profiles').select('*')
  assert(bobProfiles.length === 1 && bobProfiles[0].id === bobId, 'Bob sees only his own profile')

  // Anon views profiles: should see none
  const { data: anonProfiles } = await anonClient.from('profiles').select('*')
  assert(!anonProfiles || anonProfiles.length === 0, 'Anon sees zero profiles')

  // Alice updates profile: verify updated_at trigger
  const origUpdatedAt = aliceProfiles[0].updated_at
  await new Promise(r => setTimeout(r, 100))
  const { data: updatedAliceProfile, error: updateProfileErr } = await aliceClient
    .from('profiles')
    .update({ display_name: 'Alice In Wonderland' })
    .eq('id', aliceId)
    .select()
    .single()
  assert(!updateProfileErr && updatedAliceProfile.display_name === 'Alice In Wonderland', 'Alice updates her display name')
  assert(new Date(updatedAliceProfile.updated_at) > new Date(origUpdatedAt), 'profiles_updated_at trigger bumped updated_at')

  // Bob attempts to update Alice's profile
  const { data: bobHacksAliceProfile } = await bobClient
    .from('profiles')
    .update({ display_name: 'Hacked by Bob' })
    .eq('id', aliceId)
    .select()
  assert(!bobHacksAliceProfile || bobHacksAliceProfile.length === 0, 'Bob cannot update Alice profile (RLS enforced)')

  console.log('\n=== Step 3: Pages CRUD & Cross-User Isolation ===')
  // Alice creates Root Page
  const { data: page1, error: page1Err } = await aliceClient
    .from('pages')
    .insert({ title: 'Alice Project Roadmap', user_id: aliceId })
    .select()
    .single()
  assert(!page1Err && page1.title === 'Alice Project Roadmap', 'Alice creates Root Page 1')
  assert(page1.revision === 1, 'New page revision starts at 1')

  // Alice creates Child Page
  const { data: childPage, error: childPageErr } = await aliceClient
    .from('pages')
    .insert({ title: 'Alice Sprint 1', parent_id: page1.id, user_id: aliceId })
    .select()
    .single()
  assert(!childPageErr && childPage.parent_id === page1.id, 'Alice creates Child Page 2')

  // Bob tries to read Alice's pages
  const { data: bobReadsAlicePages } = await bobClient.from('pages').select('*').eq('id', page1.id)
  assert(!bobReadsAlicePages || bobReadsAlicePages.length === 0, 'Bob cannot read Alice page (RLS isolation)')

  // Anon tries to read Alice's pages
  const { data: anonReadsPages } = await anonClient.from('pages').select('*')
  assert(!anonReadsPages || anonReadsPages.length === 0, 'Anon cannot read any pages (RLS deny)')

  // Bob tries to update Alice's page
  const { data: bobUpdatesAlicePage } = await bobClient
    .from('pages')
    .update({ title: 'Bob Defaced This' })
    .eq('id', page1.id)
    .select()
  assert(!bobUpdatesAlicePage || bobUpdatesAlicePage.length === 0, 'Bob cannot update Alice page (RLS deny)')

  // Bob tries to delete Alice's page
  const { data: bobDeletesAlicePage } = await bobClient
    .from('pages')
    .delete()
    .eq('id', page1.id)
    .select()
  assert(!bobDeletesAlicePage || bobDeletesAlicePage.length === 0, 'Bob cannot delete Alice page (RLS deny)')

  // Bob tries to create page with parent_id set to Alice's page (cross-owner nesting)
  const { error: crossParentErr } = await bobClient
    .from('pages')
    .insert({ title: 'Bob Hijack Child', parent_id: page1.id, user_id: bobId })
  assert(!!crossParentErr, 'Bob cannot set Alice page as parent (composite FK pages_parent_owner_fk enforced)')

  // Alice updates Page 1: revision increments
  const { data: page1Rev2, error: page1Rev2Err } = await aliceClient
    .from('pages')
    .update({ title: 'Alice Project Roadmap v2' })
    .eq('id', page1.id)
    .select()
    .single()
  assert(!page1Rev2Err && page1Rev2.revision === 2, 'Page update increments revision from 1 to 2 via trigger')

  console.log('\n=== Step 4: Revision Conflict Protection ===')
  // Optimistic locking test: simulate two writers viewing revision 2
  // Writer A updates revision 2 -> becomes revision 3
  const { data: page1Rev3, error: rev3Err } = await aliceClient
    .from('pages')
    .update({ title: 'Alice Project Roadmap v3' })
    .eq('id', page1.id)
    .eq('revision', 2) // expected_revision = 2
    .select()
    .single()
  assert(!rev3Err && page1Rev3.revision === 3, 'Writer A update succeeds at expected revision 2 -> now 3')

  // Writer B attempts update with stale expected revision 2
  const { data: staleUpdate, error: staleErr } = await aliceClient
    .from('pages')
    .update({ title: 'Stale Writer Overwrite' })
    .eq('id', page1.id)
    .eq('revision', 2) // expected_revision = 2, but DB has 3!
    .select()
  assert(!staleUpdate || staleUpdate.length === 0, 'Stale update with expected_revision=2 matched 0 rows (CONFLICT protected)')

  console.log('\n=== Step 5: Blocks CRUD & Isolation ===')
  // Alice adds block
  const blockContent = {
    rich_text: [
      { text: 'First task is complete', marks: [{ type: 'bold' }] }
    ]
  }
  const { data: block1, error: block1Err } = await aliceClient
    .from('blocks')
    .insert({
      page_id: page1.id,
      user_id: aliceId,
      type: 'paragraph',
      content: blockContent,
      position: 0
    })
    .select()
    .single()
  assert(!block1Err && block1.type === 'paragraph', 'Alice creates Block 1')
  assert(block1.revision === 1, 'Block revision starts at 1')

  // Bob cannot read Alice's block
  const { data: bobReadsBlock } = await bobClient.from('blocks').select('*').eq('id', block1.id)
  assert(!bobReadsBlock || bobReadsBlock.length === 0, 'Bob cannot read Alice block (RLS isolation)')

  // Bob tries to insert block into Alice's page
  const { error: bobInsertBlockErr } = await bobClient
    .from('blocks')
    .insert({
      page_id: page1.id,
      user_id: bobId,
      type: 'paragraph',
      content: { text: 'Injected' },
      position: 99
    })
  assert(!!bobInsertBlockErr, 'Bob cannot insert block into Alice page (composite FK blocks_page_owner_fk enforced)')

  // Alice updates block: revision increments
  const { data: updatedBlock, error: updateBlockErr } = await aliceClient
    .from('blocks')
    .update({ content: { rich_text: [{ text: 'Updated task', marks: [] }] } })
    .eq('id', block1.id)
    .select()
    .single()
  assert(!updateBlockErr && updatedBlock.revision === 2, 'Block update increments revision from 1 to 2 via trigger')

  // Alice adds Block 2 and moves it
  const { data: block2 } = await aliceClient
    .from('blocks')
    .insert({
      page_id: page1.id,
      user_id: aliceId,
      type: 'bulleted_list_item',
      content: { rich_text: [{ text: 'Sub item', marks: [] }] },
      position: 1
    })
    .select()
    .single()

  // Alice moves block2 to be a child of block1
  const { data: movedBlock, error: moveErr } = await aliceClient
    .from('blocks')
    .update({ parent_block_id: block1.id, position: 0 })
    .eq('id', block2.id)
    .select()
    .single()
  assert(!moveErr && movedBlock.parent_block_id === block1.id, 'Alice nests block2 under block1 (parent_block_id)')

  // Bob tries to move block2 to Bob's page
  // First Bob creates his own page
  const { data: bobPage } = await bobClient
    .from('pages')
    .insert({ title: 'Bob Secret Page', user_id: bobId })
    .select()
    .single()

  const { error: bobMoveErr } = await bobClient
    .from('blocks')
    .update({ page_id: bobPage.id })
    .eq('id', block2.id)
  // RLS prevents Bob from updating Alice's block
  const { data: verifyBlock2 } = await aliceClient.from('blocks').select('*').eq('id', block2.id).single()
  assert(verifyBlock2.page_id === page1.id, 'Block2 remains on Alice page; Bob cannot move it')

  console.log('\n=== Step 6: Tags & Page Tags ===')
  // Alice creates Tag
  const { data: aliceTag, error: aliceTagErr } = await aliceClient
    .from('tags')
    .insert({ name: 'Architecture', user_id: aliceId })
    .select()
    .single()
  assert(!aliceTagErr && aliceTag.normalized_name === 'architecture', 'Alice creates tag, normalized_name computed stored column')

  // Bob creates same Tag name (should succeed for Bob)
  const { data: bobTag, error: bobTagErr } = await bobClient
    .from('tags')
    .insert({ name: 'Architecture', user_id: bobId })
    .select()
    .single()
  assert(!bobTagErr && bobTag.id !== aliceTag.id, 'Bob creates same tag name (per-user tags permitted)')

  // Alice creates duplicate tag with whitespace/casing: should fail uniqueness constraint
  const { error: dupTagErr } = await aliceClient
    .from('tags')
    .insert({ name: '  ARCHITECTURE  ', user_id: aliceId })
  assert(!!dupTagErr, 'Duplicate normalized tag for same user rejected (tags_user_normalized_unique)')

  // Alice links Tag to Page 1
  const { error: linkErr } = await aliceClient
    .from('page_tags')
    .insert({ page_id: page1.id, tag_id: aliceTag.id, user_id: aliceId })
  assert(!linkErr, 'Alice links tag to page in page_tags')

  // Bob cannot see Alice page_tags
  const { data: bobPageTags } = await bobClient.from('page_tags').select('*').eq('page_id', page1.id)
  assert(!bobPageTags || bobPageTags.length === 0, 'Bob cannot see Alice page_tags (RLS isolation)')

  // Bob tries to link Bob tag to Alice page
  const { error: crossLinkErr } = await bobClient
    .from('page_tags')
    .insert({ page_id: page1.id, tag_id: bobTag.id, user_id: bobId })
  assert(!!crossLinkErr, 'Bob cannot link his tag to Alice page (composite FK page_tags_page_owner_fk enforced)')

  console.log('\n=== Step 7: Search ===')
  // Alice searches for "Roadmap"
  const { data: aliceSearch } = await aliceClient
    .from('pages')
    .select('id, title')
    .ilike('title', '%Roadmap%')
  assert(aliceSearch.length >= 1 && aliceSearch[0].title.includes('Roadmap'), 'Alice searches and finds her Roadmap page')

  // Bob searches for "Roadmap"
  const { data: bobSearch } = await bobClient
    .from('pages')
    .select('id, title')
    .ilike('title', '%Roadmap%')
  assert(bobSearch.length === 0, 'Bob searches for Roadmap and gets 0 results (RLS isolation)')

  console.log('\n=== Step 8: Archive Page ===')
  // Alice archives child page
  const archiveTime = new Date().toISOString()
  const { data: archivedPage, error: archiveErr } = await aliceClient
    .from('pages')
    .update({ archived_at: archiveTime })
    .eq('id', childPage.id)
    .select()
    .single()
  assert(!archiveErr && !!archivedPage.archived_at, 'Alice archives child page')
  assert(archivedPage.revision > childPage.revision, 'Archive bumps page revision')

  console.log('\n=== Step 9: Storage Bucket & Policies ===')
  // Alice uploads file to attachments bucket at aliceId/test.txt
  const fileContent = new Blob(['Hello Second Brain attachment!'], { type: 'text/plain' })
  const aliceStoragePath = `${aliceId}/${crypto.randomUUID()}/test.txt`

  const { error: uploadErr } = await aliceClient.storage
    .from('attachments')
    .upload(aliceStoragePath, fileContent, { contentType: 'text/plain' })
  assert(!uploadErr, 'Alice uploads file to private attachments bucket under her user ID')

  // Alice downloads her file
  const { data: downloadedBlob, error: downloadErr } = await aliceClient.storage
    .from('attachments')
    .download(aliceStoragePath)
  assert(!downloadErr && !!downloadedBlob, 'Alice downloads her file successfully')

  // Bob tries to download Alice's file
  const { data: bobDownloaded, error: bobDownloadErr } = await bobClient.storage
    .from('attachments')
    .download(aliceStoragePath)
  assert(!!bobDownloadErr || !bobDownloaded, 'Bob cannot download Alice file (Storage RLS attachments_owner_read enforced)')

  // Bob tries to upload to Alice's path
  const { error: bobMaliciousUploadErr } = await bobClient.storage
    .from('attachments')
    .upload(`${aliceId}/hacked.txt`, fileContent)
  assert(!!bobMaliciousUploadErr, 'Bob cannot upload into Alice directory (Storage RLS attachments_owner_insert enforced)')

  // Bob uploads to Bob's path
  const bobStoragePath = `${bobId}/${crypto.randomUUID()}/bob.txt`
  const { error: bobUploadErr } = await bobClient.storage
    .from('attachments')
    .upload(bobStoragePath, fileContent)
  assert(!bobUploadErr, 'Bob uploads file to his own directory in attachments bucket')

  console.log('\n=============================================')
  console.log(`🎉 ALL ${results.length} END-TO-END VERIFICATION TESTS PASSED!`)
  console.log('=============================================')
}

run().catch(err => {
  console.error('\n💥 TEST RUNNER FAILED:', err)
  process.exit(1)
})
