# MCP Tool Catalog

All tools are subject to authentication, authorization, input validation, ownership checks, rate/payload limits, and audit logging.

## `search_pages`
Input: `{ query: string, tag_ids?: string[], limit?: integer, cursor?: string }`
Output: `{ results: [{ page_id, title, snippet, matching_block_id?, updated_at }], next_cursor? }`
Permission: `read`. Query must be bounded and sanitized. Results must never reveal unauthorized records.

## `get_page`
Input: `{ page_id: uuid, include_blocks?: boolean }`
Output: page metadata and, if requested, ordered canonical blocks.
Permission: `read`. Reject inaccessible IDs with a non-enumerating not-found/denied policy.

## `list_children`
Input: `{ parent_page_id?: uuid, limit?: integer, cursor?: string }`
Output: child page summaries and pagination cursor.
Permission: `read`. Null parent means workspace root.

## `create_page`
Input: `{ title: string, parent_page_id?: uuid, icon?: string, idempotency_key?: string, provenance?: object }`
Output: `{ page, created: boolean }`
Permission: `create`. Validate title length, parent ownership, idempotency key, and cycle constraints. Provenance is metadata, not trusted authorization.

## `update_page`
Input: `{ page_id: uuid, title?: string, icon?: string, expected_revision: integer, idempotency_key?: string }`
Output: updated page and revision.
Permission: `update`. Require revision for stale-write protection.

## `append_blocks`
Input: `{ page_id: uuid, blocks: Block[], expected_revision?: integer, idempotency_key: string, provenance?: object }`
Output: `{ created_block_ids: uuid[], page_revision: integer }`
Permission: `create` or `update`. Validate every block, attachment/page references, maximum batch size, and transaction behavior. The whole batch should succeed or fail atomically where feasible.

## `update_block`
Input: `{ block_id: uuid, content: object, expected_revision: integer, idempotency_key?: string }`
Output: updated block and revision.
Permission: `update`. Reject unknown/invalid payloads and stale revisions.

## `move_block`
Input: `{ block_id: uuid, target_page_id: uuid, target_parent_block_id?: uuid, position: integer, expected_revision: integer }`
Output: moved block and updated revisions.
Permission: `update`. Validate ownership, nesting rules, and atomic reordering.

## `add_tags`
Input: `{ page_id: uuid, tags: string[] }`
Output: normalized tag names and page ID.
Permission: `update`. Normalize case/whitespace and avoid duplicate tags.

## `archive_page`
Input: `{ page_id: uuid, expected_revision: integer, include_descendants?: boolean }`
Output: `{ page_id, archived_at, affected_count }`
Permission: `archive`. Descendant behavior must be explicit; default should not silently archive descendants.

## Future/destructive tools
Permanent deletion and bulk operations are not required in the initial MCP release. If added, require dedicated scopes, strong confirmation semantics, audit events, and recovery considerations.

## Common errors
`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `TOO_LARGE`, `DEPENDENCY_UNAVAILABLE`, `INTERNAL_ERROR`.

Machine-readable starting definitions live in `contracts/mcp-tools.json`.
