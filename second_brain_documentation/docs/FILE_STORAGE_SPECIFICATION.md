# File Storage Specification

## Storage model
Use private Supabase Storage buckets. Object paths should be owner-scoped, e.g. `<user_uuid>/<attachment_uuid>/<safe_filename>`. Do not treat the filename as an identifier.

## Upload lifecycle
1. Authenticate and validate request.
2. Check size and allowed type.
3. Upload to private bucket.
4. Create attachment metadata referencing the object.
5. Insert an image/file block referencing attachment ID.
6. If later steps fail, retry or clean up orphaned objects.

## Access
Use authenticated access or short-lived signed URLs. Storage policies must check owner identity and object path. Never use public buckets for private notes by default.

## Metadata
Record attachment ID, owner ID, page ID if associated, object path, display name, content type, size, checksum if available, created timestamp, and deleted state.

## Limits
Set configurable maximum size and allowlisted types. Confirm provider limits at implementation time. MIME sniffing/validation should be server-side where feasible. Disallow executable content types unless a clear use case exists.

## Deletion
Deleting a block must not automatically delete a shared attachment unless ownership/reference policy confirms it is unused. Add an orphan cleanup job only after its selection logic is tested.
