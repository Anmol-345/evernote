-- Second Brain initial schema baseline.
-- Review target project before applying. Never use a destructive reset on an existing project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.pages(id) on delete set null,
  title text not null default 'Untitled',
  icon text,
  cover_path text,
  archived_at timestamptz,
  deleted_at timestamptz,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pages_title_length check (char_length(title) between 1 and 500),
  constraint pages_not_self_parent check (parent_id is null or parent_id <> id),
  constraint pages_revision_positive check (revision > 0),
  constraint pages_id_user_unique unique (id, user_id)
);

-- Composite FK guarantees parent page has the same owner.
alter table public.pages
  drop constraint if exists pages_parent_owner_fk;
alter table public.pages
  add constraint pages_parent_owner_fk
  foreign key (parent_id, user_id) references public.pages(id, user_id)
  on delete set null (parent_id);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id uuid not null,
  parent_block_id uuid,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  schema_version integer not null default 1,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blocks_type_length check (char_length(type) between 1 and 80),
  constraint blocks_position_nonnegative check (position >= 0),
  constraint blocks_schema_version_positive check (schema_version > 0),
  constraint blocks_revision_positive check (revision > 0),
  constraint blocks_page_owner_fk foreign key (page_id, user_id)
    references public.pages(id, user_id) on delete cascade,
  constraint blocks_id_page_unique unique (id, page_id),
  constraint blocks_id_user_unique unique (id, user_id)
);

alter table public.blocks
  drop constraint if exists blocks_parent_same_page_fk;
alter table public.blocks
  add constraint blocks_parent_same_page_fk
  foreign key (parent_block_id, page_id) references public.blocks(id, page_id)
  on delete cascade;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  created_at timestamptz not null default now(),
  constraint tags_name_length check (char_length(trim(name)) between 1 and 80),
  constraint tags_user_normalized_unique unique (user_id, normalized_name),
  constraint tags_id_user_unique unique (id, user_id)
);

create table if not exists public.page_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (page_id, tag_id),
  constraint page_tags_page_owner_fk foreign key (page_id, user_id)
    references public.pages(id, user_id) on delete cascade,
  constraint page_tags_tag_owner_fk foreign key (tag_id, user_id)
    references public.tags(id, user_id) on delete cascade
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, page_id),
  constraint favorites_page_owner_fk foreign key (page_id, user_id)
    references public.pages(id, user_id) on delete cascade
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id uuid,
  storage_path text not null unique,
  filename text not null,
  content_type text,
  size_bytes bigint not null,
  checksum text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint attachments_filename_length check (char_length(filename) between 1 and 255),
  constraint attachments_size_nonnegative check (size_bytes >= 0),
  constraint attachments_page_owner_fk foreign key (page_id, user_id)
    references public.pages(id, user_id) on delete set null (page_id)
);

create table if not exists public.agent_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id text not null,
  request_id text,
  idempotency_key_hash text,
  operation text not null,
  target_page_id uuid,
  target_block_id uuid,
  outcome text not null,
  error_code text,
  created_at timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists pages_user_parent_state_idx
  on public.pages(user_id, parent_id, deleted_at, archived_at);
create index if not exists pages_user_updated_idx
  on public.pages(user_id, updated_at desc);
create index if not exists blocks_page_parent_position_idx
  on public.blocks(page_id, parent_block_id, position);
create index if not exists blocks_user_page_idx
  on public.blocks(user_id, page_id);
create index if not exists page_tags_user_tag_idx
  on public.page_tags(user_id, tag_id);
create index if not exists attachments_user_page_idx
  on public.attachments(user_id, page_id);
create index if not exists agent_operations_user_created_idx
  on public.agent_operations(user_id, created_at desc);

-- Set up updated_at and revision triggers

create or replace function public.set_updated_at_and_revision()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then
    new.revision = old.revision + 1;
  elsif tg_op = 'INSERT' then
    new.revision = 1;
  end if;
  return new;
end;
$$;

drop trigger if exists pages_updated_at_revision on public.pages;
create trigger pages_updated_at_revision
before update on public.pages
for each row execute function public.set_updated_at_and_revision();

drop trigger if exists blocks_updated_at_revision on public.blocks;
create trigger blocks_updated_at_revision
before update on public.blocks
for each row execute function public.set_updated_at_and_revision();

create or replace function public.set_updated_at_only()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at_only();

-- Profile row creation after Auth signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Enable RLS on all user-owned tables
alter table public.profiles enable row level security;
alter table public.pages enable row level security;
alter table public.blocks enable row level security;
alter table public.tags enable row level security;
alter table public.page_tags enable row level security;
alter table public.favorites enable row level security;
alter table public.attachments enable row level security;
alter table public.agent_operations enable row level security;

-- Policies are owner-scoped. Cross-owner relationships are also guarded by composite FKs.

-- Profiles: only the owner can access their profile
drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
for all to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Pages: only the owner can access their pages
drop policy if exists pages_owner_all on public.pages;
create policy pages_owner_all on public.pages
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Blocks: only the owner can access their blocks
drop policy if exists blocks_owner_all on public.blocks;
create policy blocks_owner_all on public.blocks
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Tags: only the owner can access their tags
drop policy if exists tags_owner_all on public.tags;
create policy tags_owner_all on public.tags
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Page tags: only the owner can access their page tags
drop policy if exists page_tags_owner_all on public.page_tags;
create policy page_tags_owner_all on public.page_tags
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Favorites: only the owner can access their favorites
drop policy if exists favorites_owner_all on public.favorites;
create policy favorites_owner_all on public.favorites
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Attachments: only the owner can access their attachments
drop policy if exists attachments_owner_all on public.attachments;
create policy attachments_owner_all on public.attachments
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Agent operations: authenticated users can read their own audit records
drop policy if exists agent_operations_owner_read on public.agent_operations;
create policy agent_operations_owner_read on public.agent_operations
for select to authenticated
using (user_id = (select auth.uid()));

-- Revoke insert/update/delete on agent_operations from all but trusted functions
revoke insert, update, delete on public.agent_operations from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.pages, public.blocks,
  public.tags, public.page_tags, public.favorites, public.attachments to authenticated;
grant select on public.agent_operations to authenticated;

-- Comment: Audit inserts should be made by a trusted server/database function, not directly by client.