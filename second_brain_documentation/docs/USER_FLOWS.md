# User Flows

## First launch
1. User opens web/mobile client.
2. If no session, show sign-in.
3. After successful Supabase Auth sign-in, load workspace metadata.
4. Load favorites/recent pages and page tree.
5. If empty, show a single clear “Create your first page” action.
Failure: auth/network errors are visible; do not render private cached data for a different account.

## Create and edit page
1. User creates page from sidebar or quick-create.
2. Client requests page creation; server assigns stable UUID and owner.
3. Page opens with title focused.
4. User inserts blocks using Enter, slash menu, or toolbar.
5. Client persists changes with version/concurrency metadata.
6. Show “Saving…” then “Saved” only after acknowledgement.
7. On failure, preserve local draft and expose retry; never discard unsaved text silently.

## Nested page and move
1. User selects “Move to”.
2. Show eligible parent pages excluding the page and its descendants.
3. Confirm move.
4. Server validates ownership and prevents circular hierarchy.
5. Refresh page tree and breadcrumbs.
Failure: stale parent or invalid hierarchy returns a recoverable error.

## Search
1. User enters query.
2. Debounce requests in the client.
3. Search service searches accessible page titles and block text.
4. Show snippets, page title, and useful context.
5. Selecting a result opens the page and optionally focuses the matching block.
6. Empty state offers query refinement.

## Attach file
1. Client validates basic file type and size.
2. Upload to a private bucket using a user-scoped path.
3. Create attachment metadata after successful upload.
4. Insert a file/image block referencing the attachment ID.
5. If metadata insertion fails, report orphan cleanup/retry path.
Do not rely on client MIME declarations alone for security.

## Archive and recover
1. Archive action requires confirmation if multiple descendants are affected.
2. Archived pages disappear from normal navigation but remain searchable only if product policy says so.
3. Trash view lists recoverable deleted items.
4. Restore validates that parent exists and is not deleted; otherwise restore to workspace root.
5. Permanent deletion is explicit and documented.

## MCP agent creates research
1. MCP client authenticates.
2. Agent calls `search_pages` to find the intended parent.
3. Agent calls `create_page` with title, parent, and optional idempotency key.
4. Server validates permissions and parent ownership.
5. Agent calls `append_blocks` with schema-valid blocks.
6. Server returns created IDs and page revision.
7. Web/mobile clients observe changes on refresh or via Realtime.
8. Audit record captures actor, operation, target, request ID, and result without copying all note text into logs.

## MCP update while human edits
1. Server compares expected revision/version with current revision.
2. If versions differ, return `CONFLICT` with safe metadata.
3. Agent re-reads and proposes a targeted update; it must not blindly overwrite.
4. User/client can resolve conflict.

## Offline / network failure
MVP: show cached content if available, mark it stale/offline, and prevent false “Saved” status. A queued offline write is only enabled once the sync queue and conflict policy are implemented and tested.
