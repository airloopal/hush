alter table public.payment_attempts enable row level security;

create policy payment_attempts_select_own_as_fan
  on public.payment_attempts for select
  to authenticated
  using (fan_id = auth.uid());

create policy payment_attempts_select_own_as_creator
  on public.payment_attempts for select
  to authenticated
  using (creator_id = auth.uid());

create policy payment_attempts_admin_manage
  on public.payment_attempts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Checkout creation happens server-side (a Route Handler using the
-- user's authenticated session) as the fan themselves — fan_id must equal
-- auth.uid(). protect_payment_amount (previous migration) independently
-- recomputes the amount regardless of what's inserted.
create policy payment_attempts_insert_own_as_fan
  on public.payment_attempts for insert
  to authenticated
  with check (fan_id = auth.uid());

-- No client-facing UPDATE policy at all. "Creators cannot alter payment
-- status" / "Users cannot mark payments as paid" — the only way
-- internal_status, provider_status, paid_at, provider_event_id, or
-- activated_session_id ever change is the webhook handler, which uses
-- the service-role key (bypasses RLS entirely) — the one tightly-scoped
-- place service role touches this table.

-- ---------------------------------------------------------------------------
-- Column visibility: Postgres column-level GRANTs apply per-role, not per
-- matched RLS policy, so they can't by themselves give a fan richer
-- columns than a creator on the same table. Instead: the base table's own
-- grant to `authenticated` is deliberately minimal (safe for either
-- audience), and each audience reads through its own view for anything
-- beyond that.
-- ---------------------------------------------------------------------------
grant insert on public.payment_attempts to authenticated;
revoke select on public.payment_attempts from authenticated;
grant select (
  id, fan_id, creator_id, conversation_id, amount_minor, currency,
  product_type, internal_status, paid_at, created_at
) on public.payment_attempts to authenticated;

-- Fan-facing purchase history (§9): everything a receipt reasonably
-- needs, including a payment reference and why a payment failed if it
-- did — but never the internal dedup keys.
create or replace view public.fan_payment_history as
select
  id, creator_id, conversation_id, amount_minor, currency, product_type,
  internal_status, provider_reference, provider_status, paid_at, failure_reason, created_at
from public.payment_attempts
where fan_id = auth.uid();

comment on view public.fan_payment_history is
  'Fan-facing purchase history. security_invoker so the underlying select-own-as-fan RLS policy still applies — this view only ever narrows columns, never widens row visibility.';

alter view public.fan_payment_history set (security_invoker = true);
revoke all on public.fan_payment_history from public;
grant select on public.fan_payment_history to authenticated;

-- Creator-facing earnings context (§9): amount/status/date only — no
-- provider metadata, no fan-facing failure reason, no idempotency keys.
create or replace view public.creator_payment_summary as
select
  id, fan_id, conversation_id, amount_minor, currency, product_type,
  internal_status, paid_at, created_at
from public.payment_attempts
where creator_id = auth.uid();

comment on view public.creator_payment_summary is
  'Creator-facing earnings context. security_invoker so the underlying select-own-as-creator RLS policy still applies.';

alter view public.creator_payment_summary set (security_invoker = true);
revoke all on public.creator_payment_summary from public;
grant select on public.creator_payment_summary to authenticated;
