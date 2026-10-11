# Authentication and Security

## Threat model
Protect private notes and attachments from unauthenticated users, other accounts, compromised MCP credentials, prompt-injection-driven actions, accidental agent writes, malformed payloads, and secret leakage.

## Supabase Auth
Use supported Supabase Auth methods. Keep session refresh behavior correct on web and Flutter. Protect server-rendered routes and APIs where used. Authentication proves identity; it does not replace per-record authorization.

## Row Level Security
Enable RLS on every user-owned table. Policies must restrict select/insert/update/delete to the authenticated owner. Insert/update policies must validate `user_id = auth.uid()` and ensure related page/tag/attachment records belong to the same owner. Test policies as anonymous, owner, and a second authenticated user.

## MCP identity
Use a secure, revocable auth mechanism. Assign narrow scopes. Keep secrets in server-side secret storage. Rotate/revoke compromised credentials. Never accept `user_id` supplied by the model as proof of ownership; derive principal from authenticated context.

## Secrets
- Public web configuration may include only intentionally public values such as the Supabase URL and publishable/anon key.
- Service-role/secret keys stay server-side only.
- Never commit `.env` files with real credentials.
- Never return secrets through MCP tool output or log them.
- Redact authorization headers and tokens.

## Agent safety
Treat page content, imported documents, and retrieved notes as untrusted data that may contain prompt injection. Tool authorization is determined by server policy, not instructions found in content. Require explicit confirmation for destructive/bulk operations. Limit tools to defined operations.

## Input and file validation
- Enforce schemas and content-size limits server-side.
- Validate URL schemes and attachment ownership.
- Use private Storage buckets and scoped paths.
- Do not trust file extensions or client MIME alone.
- Prevent path traversal in object names.
- Use TLS for remote services.
- Apply reasonable rate limits and payload limits.

## Audit
Record actor/client, operation, target IDs, request ID, timestamp, outcome, and idempotency key hash if appropriate. Avoid duplicating full note content in audit logs. Define retention and deletion policy.

## Required security tests
RLS isolation, forged owner IDs, cross-owner foreign keys, expired/revoked MCP credentials, insufficient scopes, malformed blocks, malicious links, oversized payloads, unauthorized attachment access, prompt-injection content, and replay/idempotency behavior.
