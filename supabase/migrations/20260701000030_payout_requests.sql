-- §6/§7: payout requests and the minimal destination data model.

do $$ begin
  create type public.payout_request_status as enum (
    'pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.creator_payout_destinations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id),
  label text not null,
  masked_reference text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),

  constraint creator_payout_destinations_label_not_blank check (length(btrim(label)) > 0)
);

comment on table public.creator_payout_destinations is
  'Minimal payout-destination reference for manual payouts (§7) — no banking integration, no sensitive account/routing data. label/masked_reference are creator-entered display hints only (e.g. "Personal Chase ...4242"), never validated or used to actually move money.';

create unique index if not exists creator_payout_destinations_one_default_idx
  on public.creator_payout_destinations (creator_id)
  where is_default;

alter table public.creator_payout_destinations enable row level security;

create policy creator_payout_destinations_select_own
  on public.creator_payout_destinations for select
  to authenticated
  using (creator_id = auth.uid());

create policy creator_payout_destinations_select_staff
  on public.creator_payout_destinations for select
  to authenticated
  using (public.is_staff());

create policy creator_payout_destinations_manage_own
  on public.creator_payout_destinations for all
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

grant select, insert, update, delete on public.creator_payout_destinations to authenticated;

create table if not exists public.creator_payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id),
  amount_minor bigint not null,
  currency text not null,
  status public.payout_request_status not null default 'pending',
  destination_id uuid references public.creator_payout_destinations(id),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  completed_at timestamptz,
  admin_notes text,

  constraint creator_payout_requests_amount_positive check (amount_minor > 0),
  constraint creator_payout_requests_currency_format check (currency ~ '^[A-Z]{3}$')
);

comment on table public.creator_payout_requests is
  'Manual payout requests (§6). The requested amount is locked at request time via a matching payout_deduction ledger entry created atomically in the same transaction (see request_payout() in the next migration) — this is what prevents double-spending the same available balance across concurrent requests, not application-level locking.';

create index if not exists creator_payout_requests_creator_idx
  on public.creator_payout_requests (creator_id, requested_at desc);
create index if not exists creator_payout_requests_status_idx
  on public.creator_payout_requests (status, requested_at desc);

alter table public.creator_ledger_entries
  add constraint creator_ledger_entries_payout_id_fkey
  foreign key (payout_id) references public.creator_payout_requests(id);

alter table public.creator_payout_requests enable row level security;

create policy creator_payout_requests_select_own
  on public.creator_payout_requests for select
  to authenticated
  using (creator_id = auth.uid());

create policy creator_payout_requests_select_staff
  on public.creator_payout_requests for select
  to authenticated
  using (public.is_staff());

grant select on public.creator_payout_requests to authenticated;

-- ---------------------------------------------------------------------------
-- §2: derived balances — never a separately-maintained mutable balance
-- column. Currency-specific (§10) — one row per (creator, currency).
-- ---------------------------------------------------------------------------
create or replace view public.creator_balances
with (security_invoker = true) as
select
  creator_id,
  currency,
  coalesce(sum(creator_net_minor) filter (where settlement_status = 'pending'), 0)::bigint as pending_balance_minor,
  coalesce(sum(creator_net_minor) filter (where settlement_status = 'available'), 0)::bigint as available_balance_minor,
  coalesce(sum(-creator_net_minor) filter (
    where entry_type = 'payout_deduction'
      and payout_id in (select id from public.creator_payout_requests where status = 'paid')
  ), 0)::bigint as paid_out_minor,
  coalesce(sum(gross_amount_minor) filter (where entry_type = 'chat_earning'), 0)::bigint as lifetime_gross_minor,
  coalesce(sum(creator_net_minor) filter (where entry_type = 'chat_earning'), 0)::bigint as lifetime_creator_earnings_minor,
  coalesce(sum(platform_fee_minor) filter (where entry_type = 'chat_earning'), 0)::bigint as lifetime_platform_fees_minor
from public.creator_ledger_entries
group by creator_id, currency;

comment on view public.creator_balances is
  'Derived, never stored — §2''s "prefer deriving financial totals from authoritative ledger records." security_invoker so the underlying creator_ledger_entries RLS (own rows, or staff) still applies to whoever queries this view.';

grant select on public.creator_balances to authenticated;
