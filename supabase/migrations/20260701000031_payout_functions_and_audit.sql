-- §6/§9/§12: the payout lifecycle and reversal functions, with real
-- concurrency protection. Every administrative action logs via the
-- EXISTING public.log_admin_action() (see
-- 20260701000025_admin_audit_log.sql) — no new audit table here, per
-- "do not duplicate functionality already implemented by the Admin
-- Portal." Creator-initiated actions (request/cancel their own payout)
-- are NOT logged there — log_admin_action() is deliberately staff-only
-- (it calls is_staff() and rejects otherwise); a creator's own actions
-- already have their own immutable record in the ledger entries they
-- create (reference + created_by), which is a more appropriate audit
-- trail for a non-administrative action than the staff action log.

-- ---------------------------------------------------------------------------
-- Settlement: flips 'pending' entries to 'available' once their hold
-- period has elapsed. Purely time-based, no user input.
-- ---------------------------------------------------------------------------
create or replace function public.settle_matured_ledger_entries()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_hold_hours integer;
begin
  select (value#>>'{}')::integer into v_hold_hours from public.platform_settings where key = 'settlement_hold_hours';
  v_hold_hours := coalesce(v_hold_hours, 48);

  update public.creator_ledger_entries
    set settlement_status = 'available'
    where settlement_status = 'pending'
      and created_at <= now() - (v_hold_hours || ' hours')::interval;
end;
$$;

revoke all on function public.settle_matured_ledger_entries() from public;
grant execute on function public.settle_matured_ledger_entries() to authenticated;

-- ---------------------------------------------------------------------------
-- §6/§12: request a payout. The advisory lock makes a second concurrent
-- call for the SAME creator block until this transaction commits or
-- rolls back, so the available-balance check below can never race.
-- ---------------------------------------------------------------------------
create or replace function public.request_payout(p_amount_minor bigint, p_currency text, p_destination_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_creator_id uuid := auth.uid();
  v_available bigint;
  v_minimum bigint;
  v_minimum_currency text;
  v_payout_id uuid;
begin
  if v_creator_id is null then
    raise exception 'Not authenticated.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_creator_id::text));

  if p_amount_minor <= 0 then
    raise exception 'Payout amount must be positive.';
  end if;

  select (value#>>'{}')::bigint into v_minimum from public.platform_settings where key = 'minimum_payout_minor';
  select trim(both '"' from (value#>>'{}')) into v_minimum_currency from public.platform_settings where key = 'minimum_payout_currency';
  if p_currency = v_minimum_currency and p_amount_minor < coalesce(v_minimum, 0) then
    raise exception 'Payout amount is below the minimum of % %.', v_minimum, v_minimum_currency;
  end if;

  select available_balance_minor into v_available
    from public.creator_balances
    where creator_id = v_creator_id and currency = p_currency;

  if v_available is null or p_amount_minor > v_available then
    raise exception 'Payout amount exceeds available balance.';
  end if;

  if p_destination_id is not null and not exists (
    select 1 from public.creator_payout_destinations where id = p_destination_id and creator_id = v_creator_id
  ) then
    raise exception 'Invalid payout destination.';
  end if;

  insert into public.creator_payout_requests (creator_id, amount_minor, currency, destination_id)
  values (v_creator_id, p_amount_minor, p_currency, p_destination_id)
  returning id into v_payout_id;

  insert into public.creator_ledger_entries (
    creator_id, entry_type, creator_net_minor, currency, settlement_status, payout_id, reference, created_by
  ) values (
    v_creator_id, 'payout_deduction', -p_amount_minor, p_currency, 'available', v_payout_id, 'Reserved for payout request', v_creator_id
  );

  return v_payout_id;
end;
$$;

revoke all on function public.request_payout(bigint, text, uuid) from public;
grant execute on function public.request_payout(bigint, text, uuid) to authenticated;

create or replace function public.cancel_payout_request(p_payout_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payout record;
begin
  select * into v_payout from public.creator_payout_requests where id = p_payout_id for update;
  if v_payout is null then
    raise exception 'Payout request not found.';
  end if;
  if v_payout.creator_id <> auth.uid() then
    raise exception 'Not authorized.';
  end if;
  if v_payout.status <> 'pending' then
    raise exception 'Only a pending payout request can be cancelled.';
  end if;

  update public.creator_payout_requests
    set status = 'cancelled', completed_at = now()
    where id = p_payout_id;

  insert into public.creator_ledger_entries (creator_id, entry_type, creator_net_minor, currency, settlement_status, payout_id, reference, created_by)
  values (v_payout.creator_id, 'reversal', v_payout.amount_minor, v_payout.currency, 'available', p_payout_id, 'Payout request cancelled by creator — funds released', v_payout.creator_id);
end;
$$;

revoke all on function public.cancel_payout_request(uuid) from public;
grant execute on function public.cancel_payout_request(uuid) to authenticated;

create or replace function public.approve_payout(p_payout_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status public.payout_request_status;
begin
  if not public.is_privileged_staff() then
    raise exception 'Not authorized.';
  end if;

  select status into v_status from public.creator_payout_requests where id = p_payout_id for update;
  if v_status is null then
    raise exception 'Payout request not found.';
  end if;
  if v_status <> 'pending' then
    raise exception 'Only a pending payout request can be approved.';
  end if;

  update public.creator_payout_requests
    set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), admin_notes = coalesce(p_notes, admin_notes)
    where id = p_payout_id;

  perform public.log_admin_action('payout.approved', 'payout_request', p_payout_id, jsonb_build_object('notes', p_notes));
end;
$$;

revoke all on function public.approve_payout(uuid, text) from public;
grant execute on function public.approve_payout(uuid, text) to authenticated;

create or replace function public.reject_payout(p_payout_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payout record;
begin
  if not public.is_privileged_staff() then
    raise exception 'Not authorized.';
  end if;

  select * into v_payout from public.creator_payout_requests where id = p_payout_id for update;
  if v_payout is null then
    raise exception 'Payout request not found.';
  end if;
  if v_payout.status not in ('pending', 'approved') then
    raise exception 'Only a pending or approved payout request can be rejected.';
  end if;

  update public.creator_payout_requests
    set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), admin_notes = p_reason, completed_at = now()
    where id = p_payout_id;

  insert into public.creator_ledger_entries (creator_id, entry_type, creator_net_minor, currency, settlement_status, payout_id, reference, created_by)
  values (v_payout.creator_id, 'reversal', v_payout.amount_minor, v_payout.currency, 'available', p_payout_id, 'Payout rejected — funds released', auth.uid());

  perform public.log_admin_action('payout.rejected', 'payout_request', p_payout_id, jsonb_build_object('reason', p_reason));
end;
$$;

revoke all on function public.reject_payout(uuid, text) from public;
grant execute on function public.reject_payout(uuid, text) to authenticated;

create or replace function public.mark_payout_processing(p_payout_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status public.payout_request_status;
begin
  if not public.is_privileged_staff() then
    raise exception 'Not authorized.';
  end if;

  select status into v_status from public.creator_payout_requests where id = p_payout_id for update;
  if v_status <> 'approved' then
    raise exception 'Only an approved payout request can be marked processing.';
  end if;

  update public.creator_payout_requests set status = 'processing' where id = p_payout_id;

  perform public.log_admin_action('payout.marked_processing', 'payout_request', p_payout_id, '{}'::jsonb);
end;
$$;

revoke all on function public.mark_payout_processing(uuid) from public;
grant execute on function public.mark_payout_processing(uuid) to authenticated;

create or replace function public.mark_payout_paid(p_payout_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status public.payout_request_status;
begin
  if not public.is_privileged_staff() then
    raise exception 'Not authorized.';
  end if;

  select status into v_status from public.creator_payout_requests where id = p_payout_id for update;
  if v_status not in ('approved', 'processing') then
    raise exception 'Only an approved or processing payout request can be marked paid.';
  end if;

  update public.creator_payout_requests
    set status = 'paid', completed_at = now(), admin_notes = coalesce(p_notes, admin_notes)
    where id = p_payout_id;

  perform public.log_admin_action('payout.marked_paid', 'payout_request', p_payout_id, jsonb_build_object('notes', p_notes));
end;
$$;

revoke all on function public.mark_payout_paid(uuid, text) from public;
grant execute on function public.mark_payout_paid(uuid, text) to authenticated;

create or replace function public.reverse_ledger_earning(p_ledger_entry_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_entry public.creator_ledger_entries;
  v_reversal_id uuid;
begin
  if not public.is_privileged_staff() then
    raise exception 'Not authorized.';
  end if;

  select * into v_entry from public.creator_ledger_entries where id = p_ledger_entry_id and entry_type = 'chat_earning';
  if v_entry is null then
    raise exception 'Ledger entry not found or not reversible.';
  end if;

  if exists (select 1 from public.creator_ledger_entries where reverses_entry_id = p_ledger_entry_id) then
    raise exception 'This entry has already been reversed.';
  end if;

  insert into public.creator_ledger_entries (
    creator_id, entry_type, source_payment_id, creator_net_minor, currency, settlement_status, reverses_entry_id, reference, created_by
  ) values (
    v_entry.creator_id, 'reversal', v_entry.source_payment_id, -v_entry.creator_net_minor, v_entry.currency, 'available', p_ledger_entry_id, p_reason, auth.uid()
  )
  returning id into v_reversal_id;

  perform public.log_admin_action('ledger.reversed', 'ledger_entry', p_ledger_entry_id, jsonb_build_object('reversal_id', v_reversal_id, 'reason', p_reason));

  return v_reversal_id;
end;
$$;

revoke all on function public.reverse_ledger_earning(uuid, text) from public;
grant execute on function public.reverse_ledger_earning(uuid, text) to authenticated;
