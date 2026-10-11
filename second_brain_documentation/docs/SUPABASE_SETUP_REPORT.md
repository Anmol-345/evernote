# Supabase Setup and Integration Report — Second Brain

**Date**: 2026-10-12  
**Target Environment**: Supabase Development Project  
**Project Reference**: `kmbkfbiebstmujnwtgdx`  
**Project API URL**: `https://kmbkfbiebstmujnwtgdx.supabase.co`  
**PostgreSQL Version**: 17.11 (aarch64 Linux)

---

## 1. Initial State Assessment

Prior to executing any changes, the Supabase project was inspected via Supabase MCP tools and direct SQL introspection:
- **Public Schema Tables**: 0 (clean project baseline)
- **Database Migrations**: 0
- **Storage Buckets**: 0
- **Auth Users**: 0
- **Status**: Pristine, uninitialized development project. No destructive reset or table drops were performed.

---

## 2. Migration Review, Corrections, and Security Hardening

### Pre-Migration Findings & Corrections
1. **Missing Trigger Function in `001_initial_schema.sql`**:
   - `001_initial_schema.sql` defined trigger `profiles_updated_at` executing `public.set_updated_at_only()`, but the function `set_updated_at_only()` was never declared. Executing the migration as written would throw an immediate `undefined function` error.
   - **Resolution**: Defined `public.set_updated_at_only()` in `database/migrations/001_initial_schema.sql` prior to the trigger definition.
2. **Destructive Statement Filter Triggering**:
   - In Supabase MCP environments, DDL queries containing `DROP ...` statements are flagged as potentially destructive and automatically aborted if unconfirmed.
   - **Resolution**: Generated a clean, purely additive DDL migration for the baseline execution.
3. **Security Linter Findings (Supabase Advisors)**:
   - `public.set_updated_at_and_revision` and `public.set_updated_at_only` were flagged with mutable `search_path` warnings.
   - `public.handle_new_user()` was a `SECURITY DEFINER` function granted execute privileges to `anon` and `authenticated` roles by default, exposing it to direct invocation via PostgREST `/rest/v1/rpc/handle_new_user`.
   - **Resolution**: Created and applied migration `003_security_hardening.sql`, setting `search_path = ''` on trigger functions and revoking execute on `handle_new_user()` from `public`, `anon`, and `authenticated`. Security lint count reduced to 0.

### Applied Migrations Summary
| Migration Version | Name | Description | Status |
|---|---|---|---|
| `20261011191838` | `001_initial_schema` | Core schema (profiles, pages, blocks, tags, page_tags, favorites, attachments, agent_operations), RLS policies, triggers, composite FKs, indexes | ✅ APPLIED |
| `20261011191956` | `002_storage_setup` | Created private `attachments` storage bucket with owner-scoped Storage RLS policies | ✅ APPLIED |
| `20261011200431` | `003_security_hardening` | Hardened search_path on trigger functions and revoked execute on security definer auth function | ✅ APPLIED |
| `20261011201121` | `004_agent_operations_rpc` | Created secure `record_agent_operation` security definer RPC for MCP audit logging | ✅ APPLIED |

---

## 3. Schema and RLS Verification

The post-migration verification script (`database/verification/001_schema_check.sql`) was executed against the database:

1. **Tables (8/8 Verified)**:
   - `profiles`, `pages`, `blocks`, `tags`, `page_tags`, `favorites`, `attachments`, `agent_operations`.
2. **Row Level Security (8/8 Enabled)**:
   - All 8 tables have `rlrowsecurity = true`.
3. **RLS Policies (8/8 Configured)**:
   - `profiles_owner_all` (`authenticated`, `id = (select auth.uid())`)
   - `pages_owner_all` (`authenticated`, `user_id = (select auth.uid())`)
   - `blocks_owner_all` (`authenticated`, `user_id = (select auth.uid())`)
   - `tags_owner_all` (`authenticated`, `user_id = (select auth.uid())`)
   - `page_tags_owner_all` (`authenticated`, `user_id = (select auth.uid())`)
   - `favorites_owner_all` (`authenticated`, `user_id = (select auth.uid())`)
   - `attachments_owner_all` (`authenticated`, `user_id = (select auth.uid())`)
   - `agent_operations_owner_read` (`authenticated`, `user_id = (select auth.uid())`)
4. **Covering Indexes**:
   - `pages_user_parent_state_idx` on `pages(user_id, parent_id, deleted_at, archived_at)`
   - `pages_user_updated_idx` on `pages(user_id, updated_at desc)`
   - `blocks_page_parent_position_idx` on `blocks(page_id, parent_block_id, position)`
   - `blocks_user_page_idx` on `blocks(user_id, page_id)`
   - `page_tags_user_tag_idx` on `page_tags(user_id, tag_id)`
   - `attachments_user_page_idx` on `attachments(user_id, page_id)`
   - `agent_operations_user_created_idx` on `agent_operations(user_id, created_at desc)`
5. **Triggers and Automated Functions**:
   - `profiles_updated_at`: updates `profiles.updated_at` on modification
   - `pages_updated_at_revision`: auto-increments `pages.revision` and sets `pages.updated_at`
   - `blocks_updated_at_revision`: auto-increments `blocks.revision` and sets `blocks.updated_at`
   - `on_auth_user_created`: auto-provisions a `profiles` row upon new user signup in `auth.users`

---

## 4. Storage Bucket and Policies

- **Bucket**: `attachments`
- **Visibility**: `public: false` (Private bucket)
- **File Size Limit**: 52,428,800 bytes (50 MB)
- **Storage Policies on `storage.objects`**:
  - `attachments_owner_read` (SELECT): checks `bucket_id = 'attachments'` and `(select auth.uid())::text = (storage.foldername(name))[1]`
  - `attachments_owner_insert` (INSERT): checks `bucket_id = 'attachments'` and `(select auth.uid())::text = (storage.foldername(name))[1]`
  - `attachments_owner_update` (UPDATE): checks `bucket_id = 'attachments'` and `(select auth.uid())::text = (storage.foldername(name))[1]`
  - `attachments_owner_delete` (DELETE): checks `bucket_id = 'attachments'` and `(select auth.uid())::text = (storage.foldername(name))[1]`

---

## 5. Security and Environment Variables

### Secret Isolation & `.gitignore`
- Configured monorepo-level and workspace-level `.gitignore` rules to prevent committing `.env`, `.env.local`, `.env.*.local`, and credential files.
- **Client Configuration (`apps/web/.env.local`)**:
  - `NEXT_PUBLIC_SUPABASE_URL=https://kmbkfbiebstmujnwtgdx.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_jwt_token>`
  - `NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:3001`
  - *No service role key is ever exposed to client-side code.*
- **Server Configuration (`packages/mcp-server/.env.local`)**:
  - `SUPABASE_URL=https://kmbkfbiebstmujnwtgdx.supabase.co`
  - `SUPABASE_ANON_KEY=<anon_jwt_token>`
  - `MCP_PORT=3001`
  - `NODE_ENV=development`

---

## 6. MCP Server Audit & Refactoring

Inspection of `packages/mcp-server/index.js` revealed that the preliminary implementation report contained inaccurate claims:
1. **No Bearer Token Authentication**: The original file lacked any JWT Bearer token authentication middleware; unauthenticated HTTP callers could trigger endpoints directly.
2. **Broken User Scoping & Security Hole**: Operations used a global Supabase client with the service role key and hardcoded string `'Service_Role_User_ID_placeholder'`. In Supabase, the service role key bypasses RLS, and hardcoding an invalid string caused UUID foreign key errors.
3. **No Streamable HTTP / MCP Protocol Implementation**: The server was merely an ad-hoc REST endpoint server with no JSON-RPC 2.0 or Streamable HTTP/SSE MCP implementation.
4. **Syntax & Runtime Errors**: TypeScript annotations in `.js` files, calling `.listen()` on an Express `Router` instead of `app`, typos in error code references (`ERROR_CODEES`), and missing validator imports.

### Actions Taken to Fix MCP Server
- Completely rewrote `packages/mcp-server/index.js` into clean, production-grade ECMAScript modules.
- Added `authenticateBearerToken` middleware that validates tokens via `supabaseAuth.auth.getUser(token)`.
- Implemented per-request user-scoped Supabase clients (`createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: 'Bearer ' + token } } })`), ensuring that every query is strictly constrained by Supabase Row-Level Security.
- Implemented JSON-RPC 2.0 Streamable HTTP transport at `POST /mcp` supporting `initialize`, `tools/list`, and `tools/call`, plus an SSE endpoint at `GET /mcp/sse`.
- Added contract schema validation (`validateMCPInput` and `validateBlockSchema`).
- Added idempotency deduplication and audit logging via `record_agent_operation` RPC.

---

## 7. Real Test Account End-to-End Verification

Two dedicated development accounts were provisioned in Supabase Auth:
- **Alice**: `alice@secondbrain.test` (`a34f9849-73a6-467e-a46d-061d8f827235`)
- **Bob**: `bob@secondbrain.test` (`9aa9bf0e-7c2f-41b6-bc9d-3e76ab4343b0`)

### Database & Storage Verification Suite (`database/verification/test_e2e_live.mjs`)
**41 / 41 Tests Passed (100% Success)**:
- ✅ Alice and Bob sign in with password and receive valid JWT sessions.
- ✅ Profiles auto-provisioned via `on_auth_user_created` trigger.
- ✅ Profiles RLS: Alice sees only Alice, Bob sees only Bob, anonymous sees 0 profiles.
- ✅ Profiles update trigger: `profiles_updated_at` automatically updates timestamp.
- ✅ Cross-user profile update denied (0 rows affected).
- ✅ Pages creation: initial revision starts at 1.
- ✅ Pages isolation: Bob cannot read, update, or delete Alice's page.
- ✅ Composite FK `pages_parent_owner_fk`: Bob cannot set Alice's page as parent.
- ✅ Revision increment: updating a page automatically bumps revision from 1 to 2.
- ✅ Optimistic locking / conflict detection: update with stale `expected_revision` matches 0 rows.
- ✅ Blocks CRUD & isolation: Bob cannot read or insert blocks into Alice's page (guarded by `blocks_page_owner_fk`).
- ✅ Blocks revision increment & hierarchy: nesting under `parent_block_id` verified.
- ✅ Tag normalization: `normalized_name` generated stored column verified.
- ✅ Tag isolation & duplicate handling: duplicate normalized tag for same user rejected; different users can have identical tag names.
- ✅ `page_tags` cross-owner guard: composite FK `page_tags_page_owner_fk` prevents cross-user linking.
- ✅ Search isolation: title search via `.ilike` returns only user-owned pages.
- ✅ Page archival: `archived_at` timestamp set, revision incremented.
- ✅ Storage bucket isolation:
  - Alice uploads file to `attachments/<alice_id>/...` and downloads successfully.
  - Bob is denied downloading Alice's attachment (`attachments_owner_read` enforced).
  - Bob is denied uploading to Alice's folder path (`attachments_owner_insert` enforced).
  - Bob uploads to `attachments/<bob_id>/...` successfully.

### MCP Server Integration Suite (`packages/mcp-server/test_mcp_live.mjs`)
**17 / 17 Tests Passed (100% Success)**:
- ✅ Health check (`GET /health`) returns 200 OK.
- ✅ Discovery endpoint (`GET /`) lists all 10 tools.
- ✅ Unauthenticated requests rejected with 401 `UNAUTHENTICATED`.
- ✅ Invalid bearer tokens rejected with 401 `UNAUTHENTICATED`.
- ✅ JSON-RPC 2.0 `initialize` responds with protocolVersion `2024-11-05` and capabilities.
- ✅ JSON-RPC 2.0 `tools/list` returns schemas for all 10 tools.
- ✅ JSON-RPC 2.0 `tools/call` enforces Bearer token authentication.
- ✅ `create_page` tool executes successfully with Alice's token.
- ✅ Idempotency replay with same key returns deduplicated result without creating duplicate rows.
- ✅ `append_blocks` tool validates schema and appends blocks with revision bump.
- ✅ Cross-user isolation: Bob's token is denied `get_page` and `update_page` on Alice's page.
- ✅ Revision conflict: update with stale `expected_revision` returns `-32009` / `CONFLICT`.
- ✅ `search_pages` tool returns only user-owned pages.

---

## 8. Remaining Blockers & Next Actions

1. **Production Service-Role Secret**:
   - The MCP server currently uses client-scoped JWT tokens (`Authorization: Bearer <jwt>`) with `SUPABASE_ANON_KEY`, which is fully secure and strictly RLS-enforced.
   - If offline background tasks or administrative jobs requiring the `SUPABASE_SERVICE_ROLE_KEY` are deployed, the service role key must be obtained securely from the Supabase Project Dashboard and set in the server-side host environment (e.g., Railway/Render secret store), never in client apps.
2. **Tiptap Rich-Text Web Integration**:
   - As documented in the implementation report, client-side Tiptap editor package installation had encountered npm registry package resolution issues. Block rendering and server-side CRUD are operational.
3. **Flutter Client Environment**:
   - Flutter SDK installation is required to compile and run the mobile client on Android/iOS.
