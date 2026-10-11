# MCP Server Specification

## Purpose
Expose a small, documented set of knowledge-base operations to AI agents. The MCP server is a controlled application interface, not a database proxy.

## Recommended implementation
- TypeScript.
- Official/current MCP SDK after verifying package documentation and compatibility.
- Remote HTTP transport supported by selected MCP clients/host; prefer Streamable HTTP where supported.
- Optional stdio transport for local development.
- Separate deployable service from Next.js.
- Shared contract package where practical.

## Request lifecycle
1. Initialize transport/session according to the SDK.
2. Authenticate client using a supported mechanism.
3. Resolve the authenticated principal and allowed scopes.
4. Validate tool input against JSON Schema.
5. Validate target ownership and operation permissions.
6. Invoke a controlled service/database function.
7. Return structured content and concise human-readable text.
8. Record audit metadata and request ID.
9. Normalize errors to documented codes.

## Authentication
Prefer OAuth or a secure, revocable per-client credential mechanism appropriate to the chosen MCP host. Do not place secrets in prompts, tool outputs, URLs, logs, or client bundles. If using bearer tokens, enforce TLS, expiration/rotation, scopes, and revocation. Document the selected mechanism and its limitations.

## Authorization
Scopes should distinguish read, create, update, archive, and destructive operations. The initial personal setup may authorize one owner, but must still check ownership for every operation. A token's existence does not bypass row-level authorization.

## Tool rules
- No arbitrary SQL tool.
- No arbitrary table/column mutation tool.
- No uncontrolled filesystem access.
- Validate IDs, content length, block types, URLs, and parent relationships.
- Destructive tools require explicit, narrow semantics.
- Agent-generated content may be marked with provenance/source metadata.
- Support idempotency for create/append where practical.
- Conflicting revisions return `CONFLICT`; do not silently overwrite.

## Hosting
Use an HTTP-capable host compatible with the selected transport. Configure health checks, request size/time limits, TLS, secret storage, logs, and deployment rollback. Verify remote client compatibility before selecting final transport details.

## Operational checks
Test initialization, authentication failures, tool discovery, schema rejection, read/write scopes, timeouts, retries, idempotency, audit events, and cross-client visibility.
