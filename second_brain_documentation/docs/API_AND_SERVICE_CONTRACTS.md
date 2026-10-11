# API and Service Contracts

## General rules
- All mutations validate identity, ownership, schema, and state.
- UUIDs are stable identifiers.
- Use UTC timestamps in ISO 8601 form.
- List operations are paginated with a documented page size cap.
- Return structured errors; do not leak SQL details or secrets.
- For mutable records, accept `expected_revision` where stale-write conflicts matter.
- Use an idempotency key for operations that may be retried after uncertain network outcomes.

## Page operations
- `createPage(title, parentId?, idempotencyKey?)`
- `getPage(pageId, includeBlocks?)`
- `updatePage(pageId, patch, expectedRevision?)`
- `listChildren(parentId?, cursor?, limit?)`
- `movePage(pageId, parentId?, expectedRevision?)`
- `archivePage(pageId, expectedRevision?)`
- `restorePage(pageId, parentId?)`
- `deletePage(pageId, mode)` where mode is explicitly `soft` or `permanent` and permanent deletion is guarded.

## Block operations
- `listBlocks(pageId, cursor?)`
- `appendBlocks(pageId, blocks[], expectedPageRevision?, idempotencyKey?)`
- `updateBlock(blockId, content, expectedRevision?)`
- `moveBlock(blockId, targetPageId, targetParentBlockId?, position, expectedRevision?)`
- `deleteBlock(blockId, expectedRevision?)`

## Search
`searchPages(query, filters?, cursor?, limit?)` returns page ID/title, safe snippet, matching block ID if available, updated timestamp, and match context. Server/database permissions apply before results are returned.

## Error envelope
```json
{
  "code": "CONFLICT",
  "message": "The page changed since it was read.",
  "retryable": false,
  "request_id": "uuid",
  "details": {"current_revision": 7}
}
```
Do not include sensitive content in `details`.

## Transactions
Operations that must keep parent ownership, block positions, and page revisions consistent should be implemented in a transaction or trusted database function. Avoid multiple client requests for logically atomic operations.
