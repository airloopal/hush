-- Defense in depth beyond RLS (same pattern established in
-- 20260701000009_protective_triggers.sql): a trigger can express "the
-- creator must currently be approved" and "the fan's account must be
-- active" more clearly than an RLS WITH CHECK subquery, and re-validates
-- on every renewal, not just first creation.

create or replace function public.protect_conversation_creation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  target_creator_status public.creator_status;
  target_fan_status public.profile_status;
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  select cp.status into target_creator_status
    from public.creator_profiles cp where cp.user_id = new.creator_id;
  if target_creator_status is null or target_creator_status <> 'approved' then
    raise exception 'Cannot start a conversation with a creator who is not approved.';
  end if;

  select p.status into target_fan_status
    from public.profiles p where p.id = new.fan_id;
  if target_fan_status is null or target_fan_status <> 'active' then
    raise exception 'Your account must be active to start a conversation.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_conversation_creation on public.conversations;
create trigger protect_conversation_creation
  before insert on public.conversations
  for each row
  execute function public.protect_conversation_creation();

-- Same two checks, re-applied on every session creation (unlock or
-- renewal) — a creator approved when the conversation started could have
-- since been suspended; a fan active then could have since been banned.
create or replace function public.protect_session_creation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  target_creator_status public.creator_status;
  target_fan_status public.profile_status;
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  select cp.status into target_creator_status
    from public.creator_profiles cp
    join public.conversations c on c.creator_id = cp.user_id
    where c.id = new.conversation_id;
  if target_creator_status is null or target_creator_status <> 'approved' then
    raise exception 'Cannot unlock or renew access — this creator is not currently approved.';
  end if;

  select p.status into target_fan_status
    from public.profiles p
    join public.conversations c on c.fan_id = p.id
    where c.id = new.conversation_id;
  if target_fan_status is null or target_fan_status <> 'active' then
    raise exception 'Your account must be active to unlock or renew access.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_session_creation on public.conversation_sessions;
create trigger protect_session_creation
  before insert on public.conversation_sessions
  for each row
  execute function public.protect_session_creation();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.conversations enable row level security;
alter table public.conversation_sessions enable row level security;

create policy conversations_select_participant
  on public.conversations for select
  to authenticated
  using (fan_id = auth.uid() or creator_id = auth.uid());

create policy conversations_insert_as_fan
  on public.conversations for insert
  to authenticated
  with check (fan_id = auth.uid());
  -- Creator-approved / fan-active checks are the protect_conversation_creation trigger above.

create policy conversations_update_participant
  on public.conversations for update
  to authenticated
  using (fan_id = auth.uid() or creator_id = auth.uid())
  with check (fan_id = auth.uid() or creator_id = auth.uid());

create policy conversations_admin_manage
  on public.conversations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy conversation_sessions_select_participant
  on public.conversation_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_sessions.conversation_id
        and (c.fan_id = auth.uid() or c.creator_id = auth.uid())
    )
  );

create policy conversation_sessions_insert_as_fan
  on public.conversation_sessions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_sessions.conversation_id
        and c.fan_id = auth.uid()
    )
  );
  -- Creator-still-approved / fan-still-active checks are the
  -- protect_session_creation trigger above.

create policy conversation_sessions_admin_manage
  on public.conversation_sessions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No general client-facing UPDATE policy on conversation_sessions —
-- status transitions to 'expired' happen via expire_conversation_sessions()
-- (SECURITY DEFINER, next migration), and refunds are admin-only.

grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.conversation_sessions to authenticated;
