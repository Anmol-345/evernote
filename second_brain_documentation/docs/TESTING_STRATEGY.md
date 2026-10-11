# Testing Strategy

## Layers
1. Unit: schema validators, ordering, hierarchy cycle checks, URL validation, search query parsing.
2. Database integration: migrations, constraints, triggers, transactional operations.
3. RLS: anonymous, owner, second user, forged user ID, cross-owner relationships.
4. MCP: initialization, discovery, authentication, tool schemas, permission scopes, errors, idempotency.
5. Web: editor interactions, autosave status, conflict retention, search, navigation.
6. Flutter: widget behavior, rendering shared block fixtures, auth, save/error states.
7. End-to-end: create on web -> read on mobile; MCP create -> web/mobile read; update conflict; attachment permissions.
8. Recovery: export, restore/import, backup verification.

## Required test matrix
- Every FR maps to at least one test in acceptance criteria.
- Every RLS table has positive and negative authorization tests.
- Every block type has valid and invalid fixtures.
- Every MCP tool has success, invalid-input, unauthorized, not-found, and dependency-failure tests as applicable.
- Every mutation with retries tests idempotency.
- Every revision-aware mutation tests stale revision conflict.
- Every attachment route tests unauthorized access.
- Every migration is applied to a clean environment.

## Tooling
Select current compatible tools for TypeScript, Next.js, Flutter, and PostgreSQL. Document exact commands after repository initialization. Do not claim a test passed without recording its command and result.

## Release gate
All critical security tests pass; no known data-loss defect; backup/restore test performed; production secrets not present in repository; MVP acceptance matrix reviewed.
