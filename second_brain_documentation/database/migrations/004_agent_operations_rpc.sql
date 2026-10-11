-- Trusted function for recording agent operations with security definer
-- Allows authenticated users to write audit entries scoped to auth.uid()
create or replace function public.record_agent_operation(
  p_actor_id text,
  p_operation text,
  p_outcome text,
  p_request_id text default null,
  p_idempotency_key_hash text default null,
  p_target_page_id uuid default null,
  p_target_block_id uuid default null,
  p_error_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.agent_operations (
    user_id, actor_id, request_id, idempotency_key_hash,
    operation, target_page_id, target_block_id, outcome, error_code
  ) values (
    (select auth.uid()), p_actor_id, p_request_id, p_idempotency_key_hash,
    p_operation, p_target_page_id, p_target_block_id, p_outcome, p_error_code
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.record_agent_operation from public, anon;
grant execute on function public.record_agent_operation to authenticated;
