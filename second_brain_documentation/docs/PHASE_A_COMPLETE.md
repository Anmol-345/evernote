# Phase A Complete — Inspect and Prepare

## Status
Phase A of the Second Brain implementation is complete. All essential architectural decisions have been recorded and the project structure has been established.

## Decisions Recorded in `docs/DECISIONS.md`

### ADR-001: Supabase as backend
- **Status**: Accepted
- **Decision**: Use Supabase; avoid separate Express backend initially
- **Consequences**: RLS and migrations are critical; platform limits must be verified

### ADR-002: Shared structured block schema
- **Status**: Accepted
- **Decision**: Versioned application-level JSON block contract; adapters per client
- **Consequences**: More upfront schema work, less cross-platform ambiguity

### ADR-003: Dedicated MCP server
- **Status**: Accepted
- **Decision**: Separate TypeScript MCP service, no arbitrary SQL tool
- **Consequences**: Extra deployment and credential lifecycle to maintain

### ADR-004: Canonical content is not Markdown
- **Status**: Accepted
- **Decision**: Structured JSON per block; Markdown used for import/export only
- **Consequences**: Editor adapters and schema migrations are required

### ADR-005: MVP synchronization is online-first
- **Status**: Accepted
- **Decision**: Reliable online saves, revision checks, visible failure; offline queue deferred
- **Consequences**: App must not advertise full offline editing in MVP

### ADR-006: Private attachments
- **Status**: Accepted
- **Decision**: Private bucket and ownership-based access
- **Consequences**: Signed URL/access lifecycle must be implemented and tested

### ADR-007: Single-user product, ownership-safe model
- **Status**: Accepted
- **Decision**: Owner-scoped rows and RLS; no collaboration features in MVP
- **Consequences**: Slightly more schema/policy work than a global single-user table

### ADR-008: Editor library selection
- **Status**: Accepted
- **Decision**:
  - Web: `@tiptap/next` with `@tiptap/extension-all` for a full-featured ProseMirror-based editor
  - Flutter: Custom adapter rendering blocks as structured rich text using explicit adapters between the canonical schema and each editor's internal format
  - MCP: JWT bearer tokens with narrow scopes from Supabase
  - Repository: Monorepo with packages under `packages/` and apps under `apps/`

### ADR-009: MCP authentication via bearer tokens with narrow scopes
- **Status**: Accepted
- **Decision**: Use JWT bearer tokens issued by Supabase, validated at the MCP server. Scopes distinguish read/create/update/archive.
- **Consequences**: Token management and rotation needed, but no arbitrary SQL exposure

### ADR-010: Repository structure is a monorepo with packages
- **Status**: Accepted
- **Decision**: Packages under `packages/` (contracts, ts-shared, mcp-server), apps under `apps/` (web, mobile)
- **Consequences**: Tooling setup needed, but import boundaries are clear

## Project Structure Established
```
second_brain_documentation/
├── docs/                    # 15 documentation files
├── database/                # SQL migrations + verification
├── contracts/               # Machine-readable schemas
├── packages/                # Shared TypeScript packages
│   ├── contracts/           # JSON schemas
│   ├── ts-shared/           # Types and validation
│   └── mcp-server/          # Express server
└── apps/                    # Application frontends
    ├── web/                 # Next.js 16 + TypeScript + Tailwind
    └── mobile/              # Flutter Dart project
```

## Dependencies Agreed
- **Phase B** (Shared contracts and database) can now proceed with established block schema
- **Phase C** (Web application) can use established Tiptap decision
- **Phase D** (MCP server) can use established auth method and tool catalog
- **Phase E** (Flutter application) can use established adapter pattern
- **Phase F** (Integration and hardening) can use established data model

## Next Phase Entry Point
Phase B — Shared contracts and database — is ready to proceed with the established block schema and project structure. The SQL migration `001_initial_schema.sql` is the authoritative source for database schema, and the TypeScript shared types package `packages/ts-shared` provides the canonical type definitions for all clients.