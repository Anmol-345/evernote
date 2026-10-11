# Editor Specification

## Decision
Use a structured, versioned block document model. Do not make Markdown the canonical stored representation. Markdown import/export may be provided as an interchange format.

## Library selection
Evaluate at implementation time:
- Web: TipTap/ProseMirror ecosystem or another actively maintained editor with extensible schema, React support, keyboard commands, and serialization.
- Flutter: evaluate a maintained rich-text/block editor (for example, a Flutter editor framework) against schema extensibility, custom blocks, accessibility, maintenance, and JSON import/export.
Do not assume a web editor's internal JSON is directly compatible with Flutter. Implement a shared application-level schema and explicit adapters. Record the final choice and package versions in `DECISIONS.md`.

## Canonical model
A page has ordered top-level blocks. A block has stable UUID, type, JSON content, order key, optional parent block ID for supported nesting, timestamps, and version/revision metadata. Child blocks must belong to the same page unless an explicit page-reference block is used.

## MVP block types
`paragraph`, `heading`, `bulleted_list_item`, `numbered_list_item`, `todo`, `quote`, `code`, `divider`, `callout`, `link`, `image`, `file`, `child_page`.
Use `contracts/block-schema.json` as the machine-readable starting contract.

## Rich text
Represent text as an array of text runs with text plus marks. Supported marks: bold, italic, underline, strike, link. Validate link schemes; reject `javascript:` and other unsafe schemes. Code blocks store plain text and optional language, not rich-text marks.

## Ordering
Use a deterministic ordering field. For MVP, integer positions with transactionally scoped reordering may be acceptable for a single-user workload. Reindex siblings in a transaction after reorder. If frequent concurrent reorder becomes a problem, evaluate fractional/rank keys. Never rely on timestamp ordering for block order.

## Editing behavior
- Enter splits paragraphs/list items according to block type.
- Backspace at an empty block follows documented merge/delete rules.
- Slash menu inserts a block at caret.
- Drag-and-drop reorders on supported platforms; accessible move-up/move-down actions are required.
- Undo/redo is local editor history; persisted operations remain server-authoritative.
- Autosave uses debounce plus flush on blur/navigation where possible; navigation must not falsely imply a failed pending write succeeded.
- Preserve local draft after a network error.
- Do not overwrite a newer server revision silently.

## Unknown types and schema versioning
Clients must preserve unknown block payloads when possible and render a safe “unsupported block” placeholder. Editing unrelated blocks must not delete unknown content. Schema changes use explicit version and migration adapters.

## Required tests
Round-trip every block type through web adapter, canonical JSON, database, MCP payload validation, and Flutter adapter. Test paste, links, malformed payloads, unknown types, reordering, and stale revision writes.
