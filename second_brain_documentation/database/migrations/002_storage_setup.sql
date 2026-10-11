-- Setup private attachments storage bucket and owner-scoped storage RLS policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 52428800, null)
on conflict (id) do nothing;

create policy "attachments_owner_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'attachments'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "attachments_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'attachments'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "attachments_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'attachments'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'attachments'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "attachments_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'attachments'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);
