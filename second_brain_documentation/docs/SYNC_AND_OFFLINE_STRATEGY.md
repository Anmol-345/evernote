# Synchronization and Offline Strategy

## Canonical source
Supabase PostgreSQL is authoritative. Clients may cache content but must distinguish cached, pending, saved, and conflicted states.

## MVP online behavior
- Debounced autosave with explicit server acknowledgement.
- Keep local draft on failure.
- Retry safe operations with idempotency keys.
- Use revisions/updated timestamps to detect stale writes.
- Realtime events may invalidate local data; refetch authoritative rows.
- On account switch, clear or isolate account-specific cache.

## Conflict handling
Mutable page/block writes include `expected_revision` where possible. A stale write returns `CONFLICT`, including the current revision and no sensitive content. Client retains local edits and offers reload/compare/reapply. Never silently apply last-write-wins to rich document content.

## Offline roadmap
Offline editing is a later milestone:
1. Persist local cache securely.
2. Queue mutations with stable IDs/idempotency keys.
3. Track base revisions.
4. Replay in dependency order.
5. Detect conflicting edits.
6. Offer resolution or a safe duplicate/draft strategy.
7. Test process termination, repeated reconnects, and partial failures.

Do not claim full offline sync until these tests pass. Realtime is notification/invalidation, not a durable mutation queue or conflict resolver.
