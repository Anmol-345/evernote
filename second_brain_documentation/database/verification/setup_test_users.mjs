import { createClient } from '../../packages/mcp-server/node_modules/@supabase/supabase-js/dist/index.mjs'

const SUPABASE_URL = 'https://kmbkfbiebstmujnwtgdx.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttYmtmYmllYnN0bXVqbnd0Z2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzkwMzMsImV4cCI6MjEwNzMxNTAzM30.ouFKeYbMJTGp4-Hduc7IVQL3UJNfPwY17jRcKCvjoFc'

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false }
})

async function register(email, password, displayName) {
  console.log(`Registering ${email}...`)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: displayName }
    }
  })
  if (error) {
    console.error(`Error registering ${email}:`, error.message)
    return null
  }
  console.log(`Registered ${email}: ID=${data.user?.id}, session=${!!data.session}`)
  return data.user
}

async function main() {
  const u1 = await register('dev_user1@secondbrain.io', 'TestPassword123!Safe', 'Alice Test')
  const u2 = await register('dev_user2@secondbrain.io', 'TestPassword123!Safe', 'Bob Test')
  console.log('Result:', { u1: u1?.id, u2: u2?.id })
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
