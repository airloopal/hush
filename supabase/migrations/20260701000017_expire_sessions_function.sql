-- There's no background job in this sprint, so a session's stored
-- `status` can go stale (still 'active' after expires_at has passed)
-- until something sweeps it. This function does that sweep for exactly
-- one conversation at a time — safe for an ordinary fan/creator to call
-- whenever they open a conversation (ConversationSessionRepository.
-- expireSessions() does this), since it only ever touches sessions
-- belonging to a conversation the caller is already a participant in (or
-- any conversation, for an admin/service-role caller).
--
-- SECURITY DEFINER is required because authenticated has no UPDATE grant
-- on conversation_sessions (see 20260701000016) — this function is the
-- one narrow, audited exception to that, not a general bypass.
create or replace function public.expire_conversation_sessions(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if current_user not in ('postgres', 'service_role') and not public.is_admin() then
    if not exists (
      select 1 from public.conversations c
      where c.id = p_conversation_id
        and (c.fan_id = auth.uid() or c.creator_id = auth.uid())
    ) then
      raise exception 'Not a participant in this conversation.';
    end if;
  end if;

  update public.conversation_sessions
    set status = 'expired'
    where conversation_id = p_conversation_id
      and status in ('pending', 'active')
      and expires_at <= now();
end;
$$;

comment on function public.expire_conversation_sessions(uuid) is
  'Lazy expiry sweep for one conversation''s sessions. Callable by either participant, or an admin/service-role for any conversation. Not a general bypass of the no-client-UPDATE rule on conversation_sessions.';

revoke all on function public.expire_conversation_sessions(uuid) from public;
grant execute on function public.expire_conversation_sessions(uuid) to authenticated;
