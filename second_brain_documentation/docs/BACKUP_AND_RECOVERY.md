# Backup and Recovery

## Principles
A trash feature is not a backup. Provider retention is not assumed. Verify current Supabase plan capabilities and establish an independent export strategy.

## Data to protect
- PostgreSQL pages, blocks, tags, favorites, attachments metadata, and relevant configuration.
- Storage objects.
- Schema migrations and seed fixtures.
- MCP configuration without credentials.

## Backup approach
- Keep migrations in version control.
- Periodically export database data using a supported PostgreSQL/Supabase method.
- Back up private Storage objects separately; database metadata alone does not preserve file bytes.
- Store backup artifacts in a separate protected location.
- Do not put backups or secrets in a public repository.
- Choose a cadence and retention period based on how much data loss is acceptable; record the decision.

## Recovery
1. Provision a clean recovery environment.
2. Apply migrations in order.
3. Restore database data and storage objects.
4. Verify ownership/foreign-key integrity and attachment paths.
5. Run search/index refresh if needed.
6. Execute verification SQL and cross-client smoke tests.
7. Record restoration date, artifact identifiers, and issues.

## Agent safety
Use soft deletion by default. Permanent deletion must be explicit. Consider a recovery window for agent-created or bulk-modified content. Audit records should support investigation but not contain full note content unnecessarily.

## Required exercise
Perform a non-production restore before the app becomes the sole copy of important information.
