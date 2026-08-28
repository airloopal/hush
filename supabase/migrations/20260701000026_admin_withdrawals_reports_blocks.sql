-- ============================================================================
-- Withdrawals (§6). Manual payouts only — no banking integration, per the
-- brief. Tracks creator payout REQUESTS; actually sending money is a
-- manual, off-platform action a staff member confirms by marking "paid".
-- ============================================================================
do $$ begin
  create type public.withdrawal_status as enum ('pending', 'approved', 'rejected', 'paid');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.creator_withdrawals (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id),
  amount_minor integer not null,
  currency text not null default 'USD',
  status public.withdrawal_status not null default 'pending',
  notes text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id),
  paid_at timestamptz,

  constraint creator_withdrawals_amount_positive check (amount_minor > 0),
  constraint creator_withdrawals_currency_format check (currency ~ '^[A-Z]{3}$')
);

comment on table public.creator_withdrawals is
  'Creator payout requests — manual payouts only (§6: "do not integrate banking"). A staff member marks these approved/rejected/paid by hand after actually sending payment off-platform.';

create index if not exists creator_withdrawals_creator_idx on public.creator_withdrawals (creator_id, requested_at desc);
create index if not exists creator_withdrawals_status_idx on public.creator_withdrawals (status, requested_at desc);

alter table public.creator_withdrawals enable row level security;

create policy creator_withdrawals_select_own
  on public.creator_withdrawals for select
  to authenticated
  using (creator_id = auth.uid());

create policy creator_withdrawals_insert_own
  on public.creator_withdrawals for insert
  to authenticated
  with check (creator_id = auth.uid() and status = 'pending');

create policy creator_withdrawals_staff_read
  on public.creator_withdrawals for select
  to authenticated
  using (public.is_staff());

create policy creator_withdrawals_staff_update
  on public.creator_withdrawals for update
  to authenticated
  using (public.is_privileged_staff())
  with check (public.is_privileged_staff());

grant select, insert on public.creator_withdrawals to authenticated;
grant update (status, notes, decided_at, decided_by, paid_at) on public.creator_withdrawals to authenticated;

-- ============================================================================
-- Moderation queue (§7). Generalizes user reports, creator reports,
-- payment disputes, abuse reports, and spam reports into one table with a
-- report_type discriminator, rather than five near-identical tables.
-- Staff-only — no public-facing "submit a report" UI is wired to this
-- table in this sprint (that's a fan/creator-facing feature, out of this
-- portal-only sprint's scope); this exists so the admin queue has a real
-- table to manage, and so a future reporting UI has somewhere to write.
-- ============================================================================
do $$ begin
  create type public.moderation_report_type as enum ('user_report', 'creator_report', 'payment_dispute', 'abuse_report', 'spam_report');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.moderation_report_status as enum ('open', 'assigned', 'resolved', 'dismissed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  report_type public.moderation_report_type not null,
  reporter_id uuid references public.profiles(id),
  reported_user_id uuid references public.profiles(id),
  reported_creator_id uuid references public.profiles(id),
  payment_attempt_id uuid references public.payment_attempts(id),
  conversation_id uuid references public.conversations(id),
  reason text not null,
  status public.moderation_report_status not null default 'open',
  assigned_to uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

comment on table public.moderation_reports is
  'Unified moderation queue for user/creator reports, payment disputes, abuse, and spam — report_type discriminates. Staff-only; no fan/creator-facing submission path is wired in this sprint.';

create index if not exists moderation_reports_status_idx on public.moderation_reports (status, created_at desc);
create index if not exists moderation_reports_assigned_idx on public.moderation_reports (assigned_to);
create index if not exists moderation_reports_type_idx on public.moderation_reports (report_type);

alter table public.moderation_reports enable row level security;

create policy moderation_reports_staff_read
  on public.moderation_reports for select
  to authenticated
  using (public.is_staff());

create policy moderation_reports_staff_update
  on public.moderation_reports for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.moderation_reports to authenticated;
grant update (status, assigned_to, notes, resolved_at) on public.moderation_reports to authenticated;

-- ============================================================================
-- Blocks (§8). A real backing table for user/creator blocking — this has
-- only ever existed as a local, demo-mode-only concept
-- (hush:blocked-creators) until now. This sprint adds the real table and
-- admin review/unblock tooling for it; it deliberately does NOT wire any
-- fan/creator-facing "block this person" UI to it (that's a messaging/
-- business-logic change outside an admin-portal-only sprint) — see
-- docs/admin-portal.md "Known remaining work".
-- ============================================================================
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id),
  blocked_id uuid not null references public.profiles(id),
  reason text,
  created_at timestamptz not null default now(),

  constraint user_blocks_distinct check (blocker_id <> blocked_id)
);

comment on table public.user_blocks is
  'Real (not demo-only) blocking record. Not yet wired to any fan/creator-facing UI — this sprint only adds admin review/unblock tooling. See docs/admin-portal.md.';

create unique index if not exists user_blocks_pair_unique_idx on public.user_blocks (blocker_id, blocked_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

create policy user_blocks_select_own
  on public.user_blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy user_blocks_insert_own
  on public.user_blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy user_blocks_delete_own
  on public.user_blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

create policy user_blocks_staff_read
  on public.user_blocks for select
  to authenticated
  using (public.is_staff());

create policy user_blocks_staff_delete
  on public.user_blocks for delete
  to authenticated
  using (public.is_staff());

grant select, insert, delete on public.user_blocks to authenticated;
