# Supabase Setup Runbook — Antigravity

## Objective
Provision and verify the intended Supabase backend using the available Supabase MCP connection. SQL migrations in `database/migrations/` are authoritative.

## Safety gates
1. Identify the target project and confirm its project reference/name with the operator before mutation.
2. Inspect current schema, tables, policies, buckets, and relevant settings first.
3. Determine whether the target contains existing data. Never reset or drop data blindly.
4. If the connected MCP is read-only, do not attempt to bypass it; report which steps require an authorized write-capable path.
5. Do not print, store, or request secrets in documentation.

## Execution
1. Read `DATABASE_SCHEMA.md`, `AUTHENTICATION_AND_SECURITY.md`, `FILE_STORAGE_SPECIFICATION.md`, and all migrations.
2. Inspect project state through available Supabase MCP tools.
3. Compare existing schema to expected migration state.
4. Explain any drift before applying changes.
5. Apply migrations in order using the supported mechanism.
6. Configure private storage bucket and policies from documented requirements.
7. Configure Auth options only where the MCP supports it; otherwise give precise manual steps.
8. Apply optional seed data only in development and only when requested.
9. Run every SQL check in `database/verification/`.
10. Test RLS using supported test roles or a separate test harness; do not infer RLS correctness from schema inspection alone.
11. Verify indexes, constraints, triggers, functions, and storage policies.
12. Produce a change report with operation, object, status, verification evidence, and unresolved issues.

## Verification checklist
- [ ] Correct project confirmed.
- [ ] No destructive reset performed.
- [ ] Migrations applied in order.
- [ ] Required tables/columns/constraints exist.
- [ ] RLS enabled on all private tables.
- [ ] Policies reviewed and tested.
- [ ] Private attachment bucket exists and policies checked.
- [ ] Search index/function exists if migration includes it.
- [ ] No service-role secret exposed to clients.
- [ ] Verification SQL output recorded.
- [ ] Remaining manual settings identified.

## Failure policy
If a tool is unavailable or an operation fails, report the exact step and observed error. Never claim successful setup without evidence. Do not invent MCP tool names or assume every Supabase dashboard setting is remotely configurable.
