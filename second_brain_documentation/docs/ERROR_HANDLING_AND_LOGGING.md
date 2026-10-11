# Error Handling and Logging

## Error codes
- `UNAUTHENTICATED`: no valid identity.
- `FORBIDDEN`: identity lacks permission.
- `NOT_FOUND`: target absent or intentionally concealed.
- `VALIDATION_ERROR`: invalid input/schema.
- `CONFLICT`: stale revision or ordering conflict.
- `RATE_LIMITED`: request threshold exceeded.
- `TOO_LARGE`: payload/file exceeds configured limit.
- `DEPENDENCY_UNAVAILABLE`: Supabase/storage dependency unavailable.
- `INTERNAL_ERROR`: unexpected failure.

## Client behavior
Show a concise message and a safe next action. Preserve drafts on write failure. Avoid infinite retries. Retry only safe/idempotent operations automatically. Provide request ID for support/debugging.

## Structured logs
Fields: timestamp, level, service, request_id, actor type/ID where safe, operation, target ID, duration, result, error code. Redact tokens, cookies, secret values, and note contents. Do not log full MCP arguments by default.

## Monitoring
Track request failures, MCP tool error rate, database/storage failures, slow search/save operations, and backup verification. Alerting can be minimal for a personal app but must make silent data loss detectable.
