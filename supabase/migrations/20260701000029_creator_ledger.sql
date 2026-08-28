-- §1: immutable creator financial ledger. Every financial event is a row
-- here; nothing about money is tracked anywhere else as a separate
-- mutable "balance" — balances are derived from this table (§2, via the
-- creator_balances view in the next migration).

do $$ begin
  create type public.ledger_entry_type as enum (
    'chat_earning', 'platform_commission', 'refund', 'reversal', 'payout_deduction', 'manual_adjustment'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.ledger_settlement_status as enum ('pending', 'available');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.creator_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id),
  entry_type public.ledger_entry_type not null,

  source_payment_id uuid references public.payment_attempts(id),
  source_conversation_id uuid references public.conversations(id),
  source_session_id uuid references public.conversation_sessions(id),

  gross_amount_minor bigint not null default 0,
  platform_fee_minor bigint not null default 0,
  creator_net_minor bigint not null,
  currency text not null,

  commission_rate_bps integer,

  settlement_status public.ledger_settlement_status not null default 'pending',
  payout_id uuid,
  -- Set only on entry_type='reversal' rows — which original entry this
  -- corrects. The original entry is never modified or excluded from
  -- balance sums; both rows simply participate normally, and their
  -- opposite-signed creator_net_minor values net out correctly by plain
  -- arithmetic (§9). Excluding the original instead would double-count.
  reverses_entry_id uuid references public.creator_ledger_entries(id),

  metadata jsonb not null default '{}'::jsonb,
  reference text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),

  constraint creator_ledger_entries_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint creator_ledger_entries_commission_range check (
    commission_rate_bps is null or (commission_rate_bps >= 0 and commission_rate_bps <= 10000)
  ),
  constraint creator_ledger_entries_earning_reconciles check (
    entry_type <> 'chat_earning' or creator_net_minor = gross_amount_minor - platform_fee_minor
  )
);

comment on table public.creator_ledger_entries is
  'Immutable append-only financial ledger — the single source of truth for creator earnings/fees/payouts/reversals. No UPDATE or DELETE is ever permitted on an existing row''s financial fields (see protect_ledger_immutability below); a correction is always a new compensating entry, never an edit.';
comment on column public.creator_ledger_entries.creator_net_minor is
  'Signed. Positive = owed to creator (earnings). Negative = leaving their balance (deductions, reversals). SUM(creator_net_minor) grouped by (creator_id, currency, settlement_status) is exactly how every balance in §2 is derived — see the creator_balances view.';

create index if not exists creator_ledger_entries_creator_currency_idx
  on public.creator_ledger_entries (creator_id, currency, settlement_status);
create index if not exists creator_ledger_entries_source_payment_idx
  on public.creator_ledger_entries (source_payment_id);
create index if not exists creator_ledger_entries_payout_idx
  on public.creator_ledger_entries (payout_id);
create index if not exists creator_ledger_entries_created_idx
  on public.creator_ledger_entries (created_at desc);

create unique index if not exists creator_ledger_entries_one_earning_per_payment_idx
  on public.creator_ledger_entries (source_payment_id)
  where entry_type = 'chat_earning' and source_payment_id is not null;

create or replace function public.protect_ledger_immutability()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.creator_id <> old.creator_id
    or new.entry_type <> old.entry_type
    or new.gross_amount_minor <> old.gross_amount_minor
    or new.platform_fee_minor <> old.platform_fee_minor
    or new.creator_net_minor <> old.creator_net_minor
    or new.currency <> old.currency
    or new.commission_rate_bps is distinct from old.commission_rate_bps
    or new.source_payment_id is distinct from old.source_payment_id
  then
    raise exception 'Ledger entries are immutable — amounts, currency, type, and source cannot be changed after creation. Create a compensating entry instead.';
  end if;

  if old.payout_id is not null and new.payout_id is distinct from old.payout_id then
    raise exception 'This ledger entry has already been claimed by a payout and cannot be reassigned.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_ledger_immutability on public.creator_ledger_entries;
create trigger protect_ledger_immutability
  before update on public.creator_ledger_entries
  for each row
  execute function public.protect_ledger_immutability();

alter table public.creator_ledger_entries enable row level security;

create policy creator_ledger_entries_select_own
  on public.creator_ledger_entries for select
  to authenticated
  using (creator_id = auth.uid());

create policy creator_ledger_entries_select_staff
  on public.creator_ledger_entries for select
  to authenticated
  using (public.is_staff());

grant select on public.creator_ledger_entries to authenticated;
