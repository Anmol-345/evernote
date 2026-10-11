-- Security hardening based on Supabase Security Advisor recommendations
-- 1. Fix mutable search_path on trigger functions
alter function public.set_updated_at_and_revision() set search_path = '';
alter function public.set_updated_at_only() set search_path = '';

-- 2. Revoke execute on security definer function handle_new_user from public/anon/authenticated
-- so it cannot be invoked directly via PostgREST RPC. It will still run as an auth trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
