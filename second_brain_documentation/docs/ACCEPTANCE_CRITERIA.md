# Acceptance Criteria

## Authentication and isolation
- AC-001: Unauthenticated user cannot read private pages, blocks, tags, favorites, or attachment objects.
- AC-002: A second authenticated test user cannot read or mutate the owner's records.
- AC-003: Forged `user_id` values do not grant access.

## Pages and blocks
- AC-010: Owner creates, renames, nests, moves, archives, restores, and deletes pages as specified.
- AC-011: Circular page move is rejected.
- AC-012: All MVP block fixtures validate and render on web and Flutter.
- AC-013: Unknown block payloads are not silently erased by unrelated edits.
- AC-014: Reordering persists deterministically.

## Saving and conflicts
- AC-020: UI shows saving until server acknowledgement.
- AC-021: Network failure preserves local draft and exposes retry.
- AC-022: Stale revision returns conflict without silent overwrite.
- AC-023: Retrying an idempotent create/append request does not duplicate content.

## Search and attachments
- AC-030: Search returns title/body matches and safe snippets.
- AC-031: Search cannot reveal inaccessible content.
- AC-032: Private attachment is readable by owner and denied to unauthorized user.
- AC-033: Failed attachment metadata creation has a documented retry/cleanup path.

## MCP
- AC-040: MCP client can discover documented tools.
- AC-041: Valid create/append returns stable IDs and revision.
- AC-042: Created content renders in web and Flutter after normal refresh/propagation.
- AC-043: Insufficient scopes and invalid inputs are rejected.
- AC-044: Audit event records operation metadata without full note content.
- AC-045: No arbitrary SQL or unrestricted table mutation tool is exposed.

## Operations
- AC-050: Clean database migration and verification pass.
- AC-051: Environment variables and secret handling are documented.
- AC-052: Export and recovery procedure is exercised in a non-production environment.
- AC-053: Deployment smoke tests pass for web and MCP.
