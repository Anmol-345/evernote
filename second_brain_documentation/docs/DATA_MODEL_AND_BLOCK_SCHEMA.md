# Canonical Data Model and Block Schema

## Page
A page has stable `id`, `user_id`, title, optional `parent_id`, optional icon/cover, state timestamps, `revision`, and timestamps. Page identity must survive moves and title changes.

## Block
A block has stable `id`, `page_id`, `user_id`, `type`, `content`, `position`, optional `parent_block_id`, `schema_version`, `revision`, and timestamps. A block ID remains stable when reordered. Reordering is not deletion plus recreation.

## Rich text
`content.rich_text` is an array of runs:
```json
[
  {"text":"Important","marks":[{"type":"bold"}]},
  {"text":" reference","marks":[]}
]
```
Supported marks: `bold`, `italic`, `underline`, `strike`, and `link` with a validated URL. Content structures differ by block type; see `contracts/block-schema.json`.

## Block examples
```json
{"type":"paragraph","content":{"rich_text":[{"text":"Hello","marks":[]}]}}
{"type":"heading","content":{"level":2,"rich_text":[{"text":"Section","marks":[]}]}}
{"type":"todo","content":{"checked":false,"rich_text":[{"text":"Review PR","marks":[]}]}}
{"type":"code","content":{"text":"print('hello')","language":"python"}}
{"type":"divider","content":{}}
{"type":"callout","content":{"emoji":"💡","rich_text":[{"text":"Remember this","marks":[]}]}}
{"type":"link","content":{"url":"https://example.com","label":"Reference"}}
{"type":"image","content":{"attachment_id":"00000000-0000-4000-8000-000000000001","alt":"Diagram"}}
{"type":"file","content":{"attachment_id":"00000000-0000-4000-8000-000000000001","display_name":"notes.pdf"}}
{"type":"child_page","content":{"page_id":"00000000-0000-4000-8000-000000000002"}}
```

## Validation
- Enforce type-specific required properties.
- Reject oversized payloads and invalid nesting.
- Validate URLs and disallow unsafe schemes.
- A referenced attachment/page must be owned by the same user.
- `heading.level` is 1–3 for MVP.
- Unknown future block types should be retained safely and rendered as unsupported; reject unknown types for new writes until explicitly enabled.

## Versioning
Include `schema_version` in persisted blocks and contracts. Add explicit migration adapters for schema changes. Export includes the schema version and IDs. See `contracts/block-schema.json`.
