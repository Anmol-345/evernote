RLS POLICIES VERIFICATION CHECKLIST

Purpose: Verify that all RLS policies are correctly configured on the Supabase migration.

Migration: database/migrations/001_initial_schema.sql

Tables and Expected Policies:

1. profiles
   - Policy: profiles_owner_all
   - Type: ALL (select/insert/update/delete)
   - To: authenticated
   - Using: id = (select auth.uid())
   - Check: ✓ in migration

2. pages
   - Policy: pages_owner_all
   - Type: ALL
   - To: authenticated
   - Using: user_id = (select auth.uid())
   - Check: ✓ in migration

3. blocks
   - Policy: blocks_owner_all
   - Type: ALL
   - To: authenticated
   - Using: user_id = (select auth.uid())
   - Check: ✓ in migration

4. tags
   - Policy: tags_owner_all
   - Type: ALL
   - To: authenticated
   - Using: user_id = (select auth.uid())
   - Check: ✓ in migration

5. page_tags
   - Policy: page_tags_owner_all
   - Type: ALL
   - To: authenticated
   - Using: user_id = (select auth.uid())
   - Check: ✓ in migration

6. favorites
   - Policy: favorites_owner_all
   - Type: ALL
   - To: authenticated
   - Using: user_id = (select auth.uid())
   - Check: ✓ in migration

7. attachments
   - Policy: attachments_owner_all
   - Type: ALL
   - To: authenticated
   - Using: user_id = (select auth.uid())
   - Check: ✓ in migration

8. agent_operations
   - Policy: agent_operations_owner_read
   - Type: SELECT
   - To: authenticated
   - Using: user_id = (select auth.uid())
   - Check: ✓ in migration
   - Additional: revoke insert/update/delete from anon, authenticated; grant select only

Cross-Owner Relationship Guards (Composite FKs):

1. pages.parent_id → references pages(id, user_id) ON DELETE SET NULL
   - Ensures parent page belongs to same user
   - ✓ in migration via pages_parent_owner_fk constraint

2. blocks.page_id + blocks.user_id → references pages(id, user_id) ON DELETE CASCADE
   - Ensures block belongs to page owned by same user
   - ✓ in migration via blocks_page_owner_fk constraint

3. blocks.parent_block_id + blocks.page_id → references blocks(id, page_id) ON DELETE CASCADE
   - Ensures parent block belongs to same page
   - ✓ in migration via blocks_parent_same_page_fk constraint

4. page_tags.page_id + page_tags.user_id → references pages(id, user_id) ON DELETE CASCADE
   - Ensures page-tag link belongs to page owned by same user
   - ✓ in migration via page_tags_page_owner_fk and page_tags_tag_owner_fk constraints

5. tags.user_id → references auth.users(id) ON DELETE CASCADE
   - Ensures tag belongs to valid Auth user
   - ✓ in migration via tags foreign key

6. attachments.page_id + attachments.user_id → references pages(id, user_id) ON DELETE SET NULL
   - Ensures attachment belongs to page owned by same user (or orphaned)
   - ✓ in migration via attachments_page_owner_fk constraint

7. page_tags.user_id → references auth.users(id) ON DELETE CASCADE
   - Ensures tag owner is valid Auth user
   - ✓ in migration

8. favorites.user_id → references auth.users(id) ON DELETE CASCADE
   - Ensures favorite owner is valid Auth user
   - ✓ in migration

Index Verification:

1. pages_user_parent_state_idx: ON (user_id, parent_id, deleted_at, archived_at)
   - ✓ in migration

2. pages_user_updated_idx: ON (user_id, updated_at DESC)
   - ✓ in migration

3. blocks_page_parent_position_idx: ON (page_id, parent_block_id, position)
   - ✓ in migration

4. blocks_user_page_idx: ON (user_id, page_id)
   - ✓ in migration

5. page_tags_user_tag_idx: ON (user_id, tag_id)
   - ✓ in migration

6. attachments_user_page_idx: ON (user_id, page_id)
   - ✓ in migration

7. agent_operations_user_created_idx: ON (user_id, created_at DESC)
   - ✓ in migration

Triggers Verification:

1. pages_updated_at_revision
   - Before UPDATE on public.pages
   - Sets new.updated_at = now()
   - If UPDATE: new.revision = old.revision + 1
   - If INSERT: new.revision = 1
   - ✓ in migration

2. blocks_updated_at_revision
   - Before UPDATE on public.blocks
   - Same logic as pages trigger
   - ✓ in migration

3. profiles_updated_at
   - Before UPDATE on public.profiles
   - Sets new.updated_at = now() only (no revision change)
   - ✓ in migration

4. on_auth_user_created
   - After INSERT on auth.users
   - Calls handle_new_user() to create profile row
   - ✓ in migration

Revision Increment Logic:
- INSERT: revision starts at 1
- UPDATE: revision increments by 1
- DELETE: not applicable (trigger only on UPDATE)
- ✓ Correctly implemented in set_updated_at_and_revision() function

Audit Policy:
- revoke insert, update, delete on public.agent_operations from anon, authenticated;
- grant select, insert, update, delete on public.profiles, public.pages, public.blocks,
  public.tags, public.page_tags, public.favorites, public.attachments to authenticated;
- grant select on public.agent_operations to authenticated;
- ✓ Correctly implemented in migration

CONCLUSION: All RLS policies, composite FK constraints, indexes, and triggers are correctly 
implemented in the migration file. The schema provides owner-scoped access with proper 
cross-owner relationship guards. No policy gaps detected.