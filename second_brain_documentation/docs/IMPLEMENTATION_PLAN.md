# Implementation Plan

## Phase 0 — Repository and decisions
Deliver: repository structure, formatting/linting, contracts package, decision records, environment examples.
Exit: editor candidate selected; block schema reviewed; app boundaries agreed.

## Phase 1 — Supabase foundation
Deliver: migrations, RLS, indexes, storage policies, verification SQL, local/staging setup.
Exit: clean migration succeeds; RLS tests pass; schema matches docs.

## Phase 2 — Web foundation
Deliver: Next.js shell, auth, sidebar, page tree, responsive design tokens.
Exit: sign-in and page navigation work with loading/error states.

## Phase 3 — Block editor
Deliver: editor adapter, supported blocks, slash menu, autosave, revisions/conflict UI.
Exit: canonical block round-trip tests pass.

## Phase 4 — Organization/search/files
Deliver: tags, favorites, archive/trash behavior, full-text search, attachments, export basics.
Exit: acceptance tests for all features pass.

## Phase 5 — MCP
Deliver: authenticated MCP service, tools, validation, audit, idempotency, integration tests.
Exit: agent-created content is visible on web; unauthorized and stale writes fail safely.

## Phase 6 — Flutter
Deliver: auth, navigation, page read/edit, block renderer/editor adapters, search, favorites.
Exit: web-created pages render correctly on Android and mobile edits round-trip.

## Phase 7 — Sync hardening/offline
Deliver: retry, cache, stale revision handling, then optional offline queue.
Exit: network interruption and conflict scenarios pass tests. Do not claim offline support until complete.

## Phase 8 — Release readiness
Deliver: security review, backups, deployment, export/restore test, operational docs.
Exit: acceptance criteria pass and recovery has been demonstrated.

## Dependency rule
Schema and block contracts precede client implementation. The MCP server and clients must consume the same contracts. Backend setup must be verified before integration is declared complete.
