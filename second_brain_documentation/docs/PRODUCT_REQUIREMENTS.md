# Product Requirements Document

## 1. Vision
A private personal knowledge workspace with a calm, Notion-inspired block editor, available on web and mobile, and exposed to AI agents through controlled MCP tools.

## 2. User and problem
Primary user: one individual who wants notes, learning material, project knowledge, references, and AI-generated research in one searchable system. The app should reduce fragmentation between browser, phone, and agents.

## 3. Goals
- G-01: Create and organize pages using nested hierarchy.
- G-02: Edit structured blocks with a polished document-first interface.
- G-03: Make the same content available across web, mobile, and MCP.
- G-04: Search page titles and block text.
- G-05: Protect personal data with server-enforced authorization.
- G-06: Make agent changes attributable and recoverable.

## 4. Non-goals for MVP
- Public collaboration or multi-user real-time co-editing.
- Full Notion database views/formulas.
- End-to-end encryption.
- General-purpose workflow automation.
- Required external LLM provider.
- Full offline-first synchronization in the first release.
- Pixel-perfect reproduction of proprietary UI/assets.

## 5. Functional requirements
- FR-001: An unauthenticated visitor cannot read or mutate private workspace content.
- FR-002: An authenticated owner can create, read, rename, move, archive, restore, and delete pages.
- FR-003: Pages may have a parent page; circular ancestry must be rejected.
- FR-004: Pages contain ordered blocks with stable IDs.
- FR-005: The editor supports paragraph, heading, bullet list item, numbered list item, checklist item, quote, code, divider, callout, link, image/file reference, and child-page blocks.
- FR-006: Users can insert blocks through a slash menu.
- FR-007: The editor provides inline marks for bold, italic, underline, strikethrough, and links where supported by the chosen model.
- FR-008: The web client autosaves with visible save status and handles failed saves.
- FR-009: Users can favorite and tag pages.
- FR-010: Users can search titles and block text with result snippets.
- FR-011: Attachments are stored privately and only accessible to authorized users.
- FR-012: The MCP server provides documented search, read, create, update, append, move, tag, and archive operations.
- FR-013: MCP writes are validated, authorized, and auditable.
- FR-014: Repeated write requests can be made safely using idempotency keys where the operation supports them.
- FR-015: Web, Flutter, and MCP use the same canonical page/block semantics.
- FR-016: Unknown block types must not be silently destroyed when read or edited.
- FR-017: Deleted content has a documented recovery strategy; permanent deletion is explicit.
- FR-018: Users can export pages or the workspace in a documented format; MVP may begin with Markdown/JSON export.
- FR-019: App reports loading, empty, offline, error, and save states accessibly.
- FR-020: Database migrations are versioned and repeatable on a clean project.

## 6. Non-functional requirements
- NFR-001 Security: RLS and server-side authorization protect every private record.
- NFR-002 Integrity: database constraints prevent invalid ownership and hierarchy references.
- NFR-003 Reliability: save success is shown only after server acknowledgement.
- NFR-004 Performance: common page open/search interactions should feel responsive; establish and measure a baseline rather than inventing guarantees.
- NFR-005 Accessibility: keyboard navigation, focus visibility, semantic labels, sufficient contrast, and scalable text.
- NFR-006 Portability: canonical data is exportable in documented formats.
- NFR-007 Maintainability: TypeScript/Dart code is linted, tested, and organized by feature.
- NFR-008 Observability: failures are diagnosable without logging note contents or secrets.
- NFR-009 Compatibility: mobile UI supports Android first; iOS is a later target.
- NFR-010 Recovery: backups and restore steps are documented and periodically tested.

## 7. MVP definition
MVP includes auth, page tree, core block editor, autosave, tags/favorites, search, private attachments, MCP read/write tools, web deployment, Android app build, security tests, and export/backup basics.

## 8. Success criteria
- Owner can create a nested page on web and read it on mobile.
- MCP agent can create a page and append blocks; content renders correctly on both clients.
- Search returns expected title/body matches.
- RLS tests prove unauthorized access is denied.
- Repeated idempotent requests do not duplicate content.
- A failed save is visible and retryable.
- Restore/export instructions have been exercised at least once before relying on production data.
