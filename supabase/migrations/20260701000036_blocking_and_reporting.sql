-- Sprint L11: Real Blocking & Reporting.
-- user_blocks and moderation_reports tables already exist (Admin Portal
-- work) — this migration only adds: (1) block enforcement inside the
-- EXISTING protective triggers/functions, and (2) a report submission
-- policy that was deliberately left unwired. No new tables, no
-- duplicated moderation system.

create or replace function public.is_blocked_pair(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_user_a and blocked_id = p_user_b)
       or (blocker_id = p_user_b and blocked_id = p_user_a)
  );
$$;

comment on function public.is_blocked_pair(uuid, uuid) is
  'True if either user has blocked the other. SECURITY DEFINER is required here: user_blocks RLS only lets a caller see rows where THEY are the blocker, so the blocked party (checking this from their own session) could never otherwise see the very block that should stop them — same rationale as is_admin()/is_staff(). Only ever returns a boolean, never raw block data, so this does not expose anything beyond what the check itself needs. Used by protect_conversation_creation, protect_session_creation, protect_message_send, and create_media_request.';

revoke all on function public.is_blocked_pair(uuid, uuid) from public;
grant execute on function public.is_blocked_pair(uuid, uuid) to authenticated;

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

  if public.is_blocked_pair(new.fan_id, new.creator_id) then
    raise exception 'Cannot start a conversation — one participant has blocked the other.';
  end if;

  return new;
end;
$$;

create or replace function public.protect_session_creation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  target_creator_status public.creator_status;
  target_fan_status public.profile_status;
  target_fan_id uuid;
  target_creator_id uuid;
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

  select fan_id, creator_id into target_fan_id, target_creator_id
    from public.conversations where id = new.conversation_id;
  if public.is_blocked_pair(target_fan_id, target_creator_id) then
    raise exception 'Cannot unlock or renew access — one participant has blocked the other.';
  end if;

  return new;
end;
$$;

create or replace function public.protect_message_send()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  target_conversation record;
  target_creator_status public.creator_status;
  target_sender_status public.profile_status;
  has_active_session boolean;
  recent_message_count integer;
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  select * into target_conversation from public.conversations where id = new.conversation_id;
  if target_conversation is null then
    raise exception 'Conversation not found.';
  end if;
  if new.sender_id <> target_conversation.fan_id and new.sender_id <> target_conversation.creator_id then
    raise exception 'Only a participant in this conversation may send a message.';
  end if;
  if auth.uid() is null or auth.uid() <> new.sender_id then
    raise exception 'Cannot send a message on behalf of another user.';
  end if;

  select p.status into target_sender_status from public.profiles p where p.id = new.sender_id;
  if target_sender_status is null or target_sender_status <> 'active' then
    raise exception 'Your account must be active to send a message.';
  end if;

  select cp.status into target_creator_status
    from public.creator_profiles cp where cp.user_id = target_conversation.creator_id;
  if target_creator_status is null or target_creator_status <> 'approved' then
    raise exception 'This creator is not currently approved for messaging.';
  end if;

  if public.is_blocked_pair(target_conversation.fan_id, target_conversation.creator_id) then
    raise exception 'Cannot send a message — one participant has blocked the other.';
  end if;

  select exists (
    select 1 from public.conversation_sessions cs
    where cs.conversation_id = new.conversation_id
      and cs.status = 'active'
      and cs.expires_at > now()
  ) into has_active_session;
  if not has_active_session then
    raise exception 'Chat access has expired for this conversation.';
  end if;

  select count(*) into recent_message_count
    from public.messages m
    where m.conversation_id = new.conversation_id
      and m.sender_id = new.sender_id
      and m.created_at > now() - interval '60 seconds';
  if recent_message_count >= 20 then
    raise exception 'You are sending messages too quickly. Please wait a moment and try again.';
  end if;

  return new;
end;
$$;

create or replace function public.create_media_request(p_conversation_id uuid, p_request_type public.media_request_type)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_fan_id uuid := auth.uid();
  v_conversation record;
  v_has_active_session boolean;
  v_creator record;
  v_amount_minor integer;
  v_payment_id uuid;
  v_idempotency_key uuid := gen_random_uuid();
begin
  if v_fan_id is null then
    raise exception 'Not authenticated.';
  end if;

  select * into v_conversation from public.conversations where id = p_conversation_id;
  if v_conversation is null or v_conversation.fan_id <> v_fan_id then
    raise exception 'Conversation not found.';
  end if;

  if public.is_blocked_pair(v_conversation.fan_id, v_conversation.creator_id) then
    raise exception 'Cannot request media — one participant has blocked the other.';
  end if;

  select exists (
    select 1 from public.conversation_sessions cs
    where cs.conversation_id = p_conversation_id and cs.status = 'active' and cs.expires_at > now()
  ) into v_has_active_session;
  if not v_has_active_session then
    raise exception 'Chat access must be active to request live media.';
  end if;

  select photo_price_minor, video_price_minor into v_creator
    from public.creator_profiles
    where user_id = v_conversation.creator_id and status = 'approved';
  if v_creator is null then
    raise exception 'This creator is not currently approved.';
  end if;
  v_amount_minor := case p_request_type when 'live_photo' then v_creator.photo_price_minor else v_creator.video_price_minor end;

  insert into public.payment_attempts (fan_id, creator_id, conversation_id, product_type, client_idempotency_key, amount_minor, currency)
  values (v_fan_id, v_conversation.creator_id, p_conversation_id, p_request_type::text, v_idempotency_key, v_amount_minor, 'USD')
  returning id into v_payment_id;

  insert into public.media_requests (conversation_id, fan_id, creator_id, request_type, amount_minor, currency, payment_attempt_id)
  values (p_conversation_id, v_fan_id, v_conversation.creator_id, p_request_type, v_amount_minor, 'USD', v_payment_id);

  return v_payment_id;
end;
$$;

-- Reporting: the deliberately-unwired submission path. reporter_id must
-- be the caller; status/assigned_to/resolved_at aren't grantable columns
-- for a reporter at all (see the column-scoped grant below), so a
-- reporter can never self-assign or self-resolve their own report.
create policy moderation_reports_insert_own
  on public.moderation_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

grant insert (report_type, reporter_id, reported_user_id, reported_creator_id, payment_attempt_id, conversation_id, reason, created_at)
  on public.moderation_reports to authenticated;
