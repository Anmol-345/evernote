# Architecture Decision Records

## ADR-001: Supabase as backend
**Status:** Accepted, implemented.
**Context:** Solo project needs managed auth, PostgreSQL, file storage, and realtime.
**Decision:** Use Supabase; avoid separate Express backend initially.
**Consequences:** RLS and migrations are critical; platform limits must be verified.

## ADR-002: Shared structured block schema
**Status:** Accepted, implemented.
**Context:** Web, Flutter, and MCP must create compatible content.
**Decision:** Versioned application-level JSON block contract; adapters per client.
**Consequences:** More upfront schema work, less cross-platform ambiguity.

## ADR-003: Dedicated MCP server
**Status:** Accepted, implemented.
**Context:** Need controlled agent access and flexible remote transport.
**Decision:** Separate TypeScript MCP service, no arbitrary SQL tool.
**Consequences:** Extra deployment and credential lifecycle to maintain.

## ADR-004: Canonical content is not Markdown
**Status:** Accepted, implemented.
**Context:** Notion-like blocks require structured types and metadata.
**Decision:** Structured JSON per block; Markdown used for import/export only.
**Consequences:** Editor adapters and schema migrations are required.

## ADR-005: MVP synchronization is online-first
**Status:** Accepted, implemented.
**Context:** Full offline editing/conflict resolution is expensive.
**Decision:** Reliable online saves, revision checks, visible failure; offline queue deferred.
**Consequences:** App must not advertise full offline editing in MVP.

## ADR-006: Private attachments
**Status:** Accepted, implemented.
**Context:** Notes may contain personal information.
**Decision:** Private bucket and ownership-based access.
**Consequences:** Signed URL/access lifecycle must be implemented and tested.

## ADR-007: Single-user product, ownership-safe model
**Status:** Accepted, implemented.
**Context:** Personal use, but accidental exposure must still be prevented.
**Decision:** Owner-scoped rows and RLS; no collaboration features in MVP.
**Consequences:** Slightly more schema/policy work than a global single-user table.

## ADR-008: Editor library selection
**Status:** Accepted, implemented.
**Context:** Need web and Flutter editors compatible with the canonical block schema.
**Decision:** 
- Web: `@tiptap/next` with `@tiptap/extension-all` for a full-featured ProseMirror-based editor.
- Flutter: Custom adapter rendering blocks as structured rich text using `flutter_tip tap` or a custom rich-text widget. For MVP, use a simplified approach with `html`/`markdown` interop where block types map to simple rich-text representations, with explicit adapters between the canonical schema and each editor's internal format.
**Consequences:** explicit adapters between web and Flutter editors, but full block round-trip is achievable.

## ADR-009: MCP authentication via bearer tokens with narrow scopes
**Status:** Accepted, implemented.
**Context:** Need secure, revocable per-client credential mechanism.
**Decision:** Use JWT bearer tokens issued by Supabase, validated at the MCP server. Scopes distinguish read/create/update/archive.
**Consequences:** Token management and rotation needed, but no arbitrary SQL exposure.

## ADR-010: Repository structure is a monorepo with packages
**Status:** Accepted, implemented.
**Context:** Web, mobile, and MCP share contracts and need coordinated releases.
**Decision:** Packages under `packages/` directory: `contracts`, `ts-shared`, `mcp-server`. Apps under `apps/`: `web`, `mobile`.
**Consequences:** Tooling setup (turbo/nx or simple npm workspaces) needed, but import boundaries are clear.