# Database Schema

The SQL migrations under `database/migrations/` are the executable source of truth. This document explains the model; update both this document and migrations together.

## Core tables
- `profiles`: one row per Auth user, optional display preferences.
- `pages`: UUID, owner `user_id`, title, parent page, icon, cover metadata, archived/deleted timestamps, created/updated timestamps, revision.
- `blocks`: UUID, owner `user_id`, page ID, optional parent block ID, type, JSONB content, integer position, schema version, timestamps, revision.
- `tags`: UUID, owner, normalized name, created timestamp.
- `page_tags`: page/tag relationship with owner consistency.
- `favorites`: owner/page relationship.
- `attachments`: UUID, owner, page ID, storage path, filename, MIME, size, timestamps.
- `agent_operations`: audit metadata for MCP operations; avoid storing full sensitive payloads.

## Integrity rules
- Every user-owned row includes `user_id` and has RLS.
- `pages.parent_id` references a page owned by the same user; application/RPC validation must prevent cycles.
- Blocks reference a page owned by the same user. Optional parent block must belong to the same page.
- Positions are unique within a page and parent scope, or reordering is serialized by a transaction.
- `page_tags` cannot link records owned by different users.
- Storage object paths are owner-scoped and protected by Storage policies.
- Deletion behavior is explicit. Prefer soft-delete/archival for recoverability; permanent deletion is a separate operation.
- Use `updated_at` triggers and revision increments for mutations.

## Indexes
At minimum evaluate indexes on:
- `pages(user_id, parent_id, deleted_at, archived_at)`
- `pages(user_id, updated_at desc)`
- `blocks(page_id, parent_block_id, position)`
- `blocks(user_id, page_id)`
- tag relationship foreign keys
- attachment page/owner fields
- full-text search vectors.

## Security
Enable RLS on all private tables. A basic policy checks `auth.uid() = user_id`, but relationship policies and mutation functions must also ensure all linked records share the same owner. Do not rely only on a client filter.

## Migrations
1. `001_initial_schema.sql`: extensions, tables, constraints, indexes, timestamps, RLS policies.
2. Later migrations should add search, RPCs, audit functions, and policy refinements in small increments.
Do not run destructive schema resets on a project containing data.
