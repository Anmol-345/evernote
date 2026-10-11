# Second Brain — Project Documentation

A documentation-first specification for a personal, Notion-inspired knowledge base with a Next.js web client, Flutter mobile client, Supabase backend, and MCP interface for AI agents.

## Goals
- One canonical knowledge base shared by web, mobile, and MCP clients.
- Minimalist, Notion-inspired page and block editing.
- Secure, auditable agent writes.
- Explicit contracts, migrations, tests, and operational procedures.

## Repository layout
- `docs/`: product, design, architecture, security, implementation, and operations specifications.
- `database/migrations/`: ordered SQL migrations; source of truth for schema changes.
- `database/verification/`: SQL checks to run after migrations.
- `database/seed/`: optional local-development seed data only.
- `contracts/`: machine-readable block, MCP tool, and error contracts.

## Recommended reading order
1. `docs/AGENT_INSTRUCTIONS.md`
2. `docs/PRODUCT_REQUIREMENTS.md`
3. `docs/DECISIONS.md` and `docs/ASSUMPTIONS_AND_OPEN_QUESTIONS.md`
4. `docs/DATA_MODEL_AND_BLOCK_SCHEMA.md`
5. `docs/DATABASE_SCHEMA.md` and SQL migrations
6. `docs/TECHNICAL_ARCHITECTURE.md`
7. `docs/AUTHENTICATION_AND_SECURITY.md`
8. `docs/EDITOR_SPECIFICATION.md`
9. `docs/MCP_SERVER_SPECIFICATION.md` and `docs/MCP_TOOL_CATALOG.md`
10. `docs/IMPLEMENTATION_PLAN.md`, `docs/TASK_BREAKDOWN.md`
11. `docs/TESTING_STRATEGY.md`, `docs/ACCEPTANCE_CRITERIA.md`
12. Deployment and operations documents.

## Working assumptions
- Personal-first use, initially one owner account.
- Next.js + TypeScript for web; Flutter + Dart for mobile.
- Supabase PostgreSQL/Auth/Storage, with RLS.
- Dedicated TypeScript MCP service using a supported remote HTTP transport.
- Block content is structured JSON, not Markdown as the canonical representation.
- Offline-first editing is a later phase; the MVP requires reliable online saves and explicit conflict handling.
- Product name is provisional: “Second Brain”.

## Status
This is a proposed implementation specification, not evidence that infrastructure has been provisioned or code has been tested. Verify current package versions, SDK behavior, Supabase MCP capabilities, and provider limits at implementation time.
