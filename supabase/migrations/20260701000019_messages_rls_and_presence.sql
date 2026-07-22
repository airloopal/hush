-- ============================================================================
-- messages RLS
-- ============================================================================
alter table public.messages enable row level security;

create policy messages_select_participant
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.fan_id = auth.uid() or c.creator_id = auth.uid())
    )
  );

create policy messages_insert_as_self
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid());
  -- Participation, active session, creator approval, and the rate limit
  -- are all enforced by protect_message_send (previous migration) — RLS
  -- alone can't express "only 20 in the last 60 seconds" cleanly.

create policy messages_admin_manage
  on public.messages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No UPDATE/DELETE policy for ordinary participants — there is no edit or
-- delete UI this sprint (deleted_at/edited_at are schema-only, per spec).

grant select, insert on public.messages to authenticated;

-- Keep conversations.latest_message_at/preview in sync automatically, so
-- nothing in the application has to remember to call updateLatestMessage
-- after every send.
create or replace function public.sync_conversation_latest_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.conversations
    set latest_message_at = new.created_at,
        latest_message_preview = left(new.body, 200)
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists sync_conversation_latest_message on public.messages;
create trigger sync_conversation_latest_message
  after insert on public.messages
  for each row
  execute function public.sync_conversation_latest_message();

-- ============================================================================
-- conversation_reads RLS
-- ============================================================================
alter table public.conversation_reads enable row level security;

create policy conversation_reads_select_own
  on public.conversation_reads for select
  to authenticated
  using (user_id = auth.uid());

create policy conversation_reads_insert_own
  on public.conversation_reads for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_reads.conversation_id
        and (c.fan_id = auth.uid() or c.creator_id = auth.uid())
    )
  );

create policy conversation_reads_update_own
  on public.conversation_reads for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy conversation_reads_admin_manage
  on public.conversation_reads for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.conversation_reads to authenticated;

-- ============================================================================
-- user_presence RLS
-- ============================================================================
alter table public.user_presence enable row level security;

-- "Read limited presence information only where appropriate": visible to
-- the user themselves, and to anyone who shares a conversation with them
-- (i.e. the other participant in an active or past chat) — never a
-- global public presence list. Never proof of authorization for anything
-- else (§10) — nothing in this schema grants access based on this table.
create policy user_presence_select_self_or_conversation_partner
  on public.user_presence for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where (c.fan_id = auth.uid() and c.creator_id = user_presence.user_id)
         or (c.creator_id = auth.uid() and c.fan_id = user_presence.user_id)
    )
  );

create policy user_presence_admin_manage
  on public.user_presence for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No client-facing INSERT/UPDATE policy at all — the only write path is
-- touch_presence() below. "Users cannot manually set themselves online."
grant select on public.user_presence to authenticated;

-- Throttled, system-derived presence write. SECURITY DEFINER because
-- authenticated has no direct table grant; the throttle (skip the write
-- entirely if updated within the last 20 seconds) is enforced here, not
-- trusted from the client, so a caller invoking this rapidly still only
-- generates a write roughly every 20s.
create or replace function public.touch_presence()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    return;
  end if;

  insert into public.user_presence (user_id, last_seen_at, last_active_at, updated_at)
  values (caller, now(), now(), now())
  on conflict (user_id) do update
    set last_seen_at = now(),
        last_active_at = now(),
        updated_at = now()
    where public.user_presence.updated_at < now() - interval '20 seconds';
end;
$$;

comment on function public.touch_presence() is
  'The only write path for user_presence. Self-throttled to roughly one write per 20 seconds per user regardless of call frequency — see docs/realtime-messaging.md "Presence".';

revoke all on function public.touch_presence() from public;
grant execute on function public.touch_presence() to authenticated;

-- Convenience RPC — marks a conversation read up to a given message (or
-- "now" with no specific message) for the calling participant only.
create or replace function public.mark_conversation_read(p_conversation_id uuid, p_message_id uuid default null)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (c.fan_id = auth.uid() or c.creator_id = auth.uid())
  ) then
    raise exception 'Not a participant in this conversation.';
  end if;

  insert into public.conversation_reads (conversation_id, user_id, last_read_message_id, last_read_at)
  values (p_conversation_id, auth.uid(), p_message_id, now())
  on conflict (conversation_id, user_id) do update
    set last_read_message_id = coalesce(p_message_id, public.conversation_reads.last_read_message_id),
        last_read_at = now();
end;
$$;

revoke all on function public.mark_conversation_read(uuid, uuid) from public;
grant execute on function public.mark_conversation_read(uuid, uuid) to authenticated;
