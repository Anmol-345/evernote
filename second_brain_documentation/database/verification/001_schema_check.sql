-- Run after migrations. These checks report expected tables and RLS state.

-- Check all expected tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles','pages','blocks','tags','page_tags','favorites','attachments','agent_operations'
  )
order by table_name;

-- Check RLS is enabled on all private tables
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles','pages','blocks','tags','page_tags','favorites','attachments','agent_operations'
  )
order by c.relname;

-- Check RLS policies exist and are correct
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles','pages','blocks','tags','page_tags','favorites','attachments','agent_operations'
  )
order by tablename, policyname;

-- Check indexes exist
select indexname, tablename, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'profiles','pages','blocks','tags','page_tags','favorites','attachments','agent_operations'
  )
  and indexname like '%_idx'
order by tablename, indexname;

-- Check triggers exist and are correct
select tgname, tgrelid::regclass as table_name, tgenabled
from pg_trigger
where tgrelid::regclass in (
  'profiles','pages','blocks'
)
order by tgname;