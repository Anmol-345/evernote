# Operations Runbook

## Routine checks
- Confirm web and MCP health endpoints/availability.
- Review error rates, failed writes, and dependency errors.
- Verify scheduled/periodic backups complete.
- Periodically test restoring a backup.
- Review credential rotation and revoke unused MCP credentials.
- Update dependencies deliberately and run the test suite.

## Troubleshooting
**Sign-in fails:** verify Supabase URL/key, Auth settings, redirect URLs, session handling, and network access.
**Page missing:** verify identity, RLS, page state (archived/deleted), and parent relationships.
**Save stuck:** inspect request ID and service logs; preserve client draft; check revision conflict and network.
**MCP tool fails:** verify transport/client compatibility, authentication/scopes, schema, server logs, and Supabase status.
**Attachment denied:** verify private bucket policy, object path ownership, and signed URL expiration.
**Search incomplete:** inspect search index/update trigger and confirm block types are included.

## Incident response
1. Preserve logs without exporting note content unnecessarily.
2. Revoke suspected compromised MCP credential.
3. Disable affected write tools if needed.
4. Determine affected record IDs and operation window.
5. Restore or correct data using a tested process.
6. Rotate secrets and document the incident.
7. Add regression tests for the failure.

## Changes
All schema changes require a migration, verification, and update to the relevant docs. Never make undocumented production-only changes.
