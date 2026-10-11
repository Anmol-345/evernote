# Assumptions and Open Questions

## Working assumptions
- Product name “Second Brain” is temporary.
- Initial human user is the owner.
- Android is the initial mobile platform.
- Light theme is default; dark theme is optional.
- Web uses Next.js/TypeScript; mobile uses Flutter/Dart.
- Supabase is the shared backend.
- MCP is a dedicated TypeScript service.
- Structured block JSON is canonical.
- MVP prioritizes online reliability over full offline editing.
- Core note-taking works without an external AI API.

## Decisions to confirm during Phase 0
1. Exact editor libraries for web and Flutter, based on shared schema compatibility.
2. Whether the first mobile release needs editing all block types or read-mostly support for advanced blocks.
3. MCP authentication method: OAuth versus revocable per-client credential mechanism based on intended MCP clients.
4. Remote MCP exposure versus local-only access.
5. Maximum attachment size and allowed file types.
6. Soft-delete retention policy and permanent-delete UX.
7. Whether page covers are MVP or deferred.
8. Export format and whether import is required for MVP.
9. Offline editing scope and acceptable conflict UX.
10. Repository arrangement: monorepo or separate Flutter project.
11. Hosting provider for MCP.
12. Backup cadence and retention.
13. Whether agent-generated content first lands in an AI inbox.

## Provisional defaults
Use a private personal workspace; remote MCP only with authentication; no public sharing; read/create/update scopes separated; destructive MCP operations deferred; Markdown export first; page covers deferred; Android first; online-first MVP.
