-- §Creation: fan requests a live photo/video within an existing,
-- currently-active conversation. Creates the payment_attempt (reusing
-- Sprint L5's checkout machinery — protect_payment_amount, from the
-- previous migration, sets the real price) and the media_requests row
-- together, atomically, so a media request can never exist without a
-- matching payment attempt.
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

  select exists (
    select 1 from public.conversation_sessions cs
    where cs.conversation_id = p_conversation_id and cs.status = 'active' and cs.expires_at > now()
  ) into v_has_active_session;
  if not v_has_active_session then
    raise exception 'Chat access must be active to request live media.';
  end if;

  -- Computed directly here, not left to protect_payment_amount: this
  -- function is SECURITY DEFINER, so current_user inside it is the
  -- function's owner, not the calling fan — protect_payment_amount's
  -- "trusted internal caller" early-exit (current_user in ('postgres',
  -- 'service_role')) would otherwise skip price correction entirely for
  -- this specific INSERT. Getting the current, approved price here
  -- ourselves keeps the same server-side price authority guarantee.
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

revoke all on function public.create_media_request(uuid, public.media_request_type) from public;
grant execute on function public.create_media_request(uuid, public.media_request_type) to authenticated;

-- Shared internal helper: reverses the ledger earning for a media request
-- and flags it refund_required. Only ever corrects Hush's own books; the
-- actual money movement back to the fan's card is a manual, provider-side
-- follow-up, exactly like Sprint L8's payout system requires for payouts.
-- Not exposed directly — called by decline/expire below.
create or replace function public.refund_media_request(p_media_request_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_earning record;
begin
  select * into v_earning from public.creator_ledger_entries
    where source_payment_id = (select payment_attempt_id from public.media_requests where id = p_media_request_id)
      and entry_type = 'chat_earning';

  -- Deliberately checks v_earning.id, not "v_earning is not null": for a
  -- composite/record value, "IS NOT NULL" is only true when EVERY field
  -- is non-null (SQL row-comparison semantics) — since most columns here
  -- (source_conversation_id, reference, created_by, ...) are legitimately
  -- nullable, that check would silently skip the reversal for almost any
  -- real row found, even though SELECT INTO genuinely matched one.
  if v_earning.id is not null and not exists (
    select 1 from public.creator_ledger_entries where reverses_entry_id = v_earning.id
  ) then
    insert into public.creator_ledger_entries (
      creator_id, entry_type, source_payment_id, creator_net_minor, currency, settlement_status, reverses_entry_id, reference, created_by
    ) values (
      v_earning.creator_id, 'reversal', v_earning.source_payment_id, -v_earning.creator_net_minor, v_earning.currency,
      'available', v_earning.id, p_reason, auth.uid()
    );
  end if;

  update public.media_requests set status = 'refund_required', decline_reason = p_reason where id = p_media_request_id;
end;
$$;

revoke all on function public.refund_media_request(uuid, text) from public;

create or replace function public.accept_media_request(p_media_request_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request public.media_requests;
begin
  select * into v_request from public.media_requests where id = p_media_request_id for update;
  if v_request is null then
    raise exception 'Media request not found.';
  end if;
  if v_request.creator_id <> auth.uid() then
    raise exception 'Only the requested creator may accept this request.';
  end if;
  if v_request.status <> 'pending_creator' then
    raise exception 'Only a request awaiting your response can be accepted.';
  end if;

  update public.media_requests
    set status = 'accepted', responded_at = now(), expires_at = now() + interval '24 hours'
    where id = p_media_request_id;
end;
$$;

revoke all on function public.accept_media_request(uuid) from public;
grant execute on function public.accept_media_request(uuid) to authenticated;

create or replace function public.decline_media_request(p_media_request_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request public.media_requests;
begin
  select * into v_request from public.media_requests where id = p_media_request_id for update;
  if v_request is null then
    raise exception 'Media request not found.';
  end if;
  if v_request.creator_id <> auth.uid() then
    raise exception 'Only the requested creator may decline this request.';
  end if;
  if v_request.status not in ('pending_creator', 'accepted') then
    raise exception 'This request can no longer be declined.';
  end if;

  update public.media_requests set responded_at = now() where id = p_media_request_id;
  perform public.refund_media_request(p_media_request_id, coalesce(p_reason, 'Declined by creator'));
end;
$$;

revoke all on function public.decline_media_request(uuid, text) from public;
grant execute on function public.decline_media_request(uuid, text) to authenticated;

-- Fulfilment records the storage path and flips status — the actual file
-- upload (validated for type/size) happens via a Route Handler using the
-- service-role client (app/api/media-requests/[id]/fulfil), which calls
-- this function afterward. Storage RLS (media_requests_storage_insert,
-- previous migration) independently requires status='accepted' for a
-- direct authenticated upload too.
create or replace function public.fulfil_media_request(p_media_request_id uuid, p_storage_path text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request public.media_requests;
begin
  select * into v_request from public.media_requests where id = p_media_request_id for update;
  if v_request is null then
    raise exception 'Media request not found.';
  end if;
  if v_request.creator_id <> auth.uid() and current_user not in ('postgres', 'service_role') then
    raise exception 'Only the requested creator may fulfil this request.';
  end if;
  if v_request.status <> 'accepted' then
    raise exception 'Only an accepted request can be fulfilled.';
  end if;

  update public.media_requests
    set status = 'fulfilled', storage_path = p_storage_path, fulfilled_at = now()
    where id = p_media_request_id;
end;
$$;

revoke all on function public.fulfil_media_request(uuid, text) from public;
grant execute on function public.fulfil_media_request(uuid, text) to authenticated;

-- Lazy expiry sweep — mirrors expire_conversation_sessions (Sprint L3) and
-- settle_matured_ledger_entries (Sprint L8): purely time-based, no user
-- input, safe for any authenticated caller to trigger opportunistically.
create or replace function public.expire_stale_media_requests()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request record;
begin
  for v_request in
    select id from public.media_requests
    where status in ('pending_creator', 'accepted') and expires_at is not null and expires_at <= now()
  loop
    update public.media_requests set status = 'expired' where id = v_request.id;
    perform public.refund_media_request(v_request.id, 'Creator did not fulfil the request in time');
  end loop;
end;
$$;

revoke all on function public.expire_stale_media_requests() from public;
grant execute on function public.expire_stale_media_requests() to authenticated;
