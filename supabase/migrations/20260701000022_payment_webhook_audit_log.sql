-- Records every webhook delivery attempt (accepted, rejected, duplicate,
-- or unrecognized) for audit purposes — separate from payment_attempts,
-- which only ever reflects the current state of a payment, not the full
-- history of delivery attempts against it. Deliberately does NOT store
-- the raw request body or header values — a SHA-256 hash is enough to
-- verify/audit exact-duplicate deliveries and detect tampering after the
-- fact, without retaining a full webhook payload (whose contents are
-- provider-defined and not something Hush should assume are safe to keep
-- indefinitely) or any header value that could itself be a credential
-- (e.g. the signature itself).

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  received_at timestamptz not null default now(),
  signature_valid boolean not null,
  provider_event_id text,
  payment_attempt_id uuid references public.payment_attempts(id),
  outcome text not null,
  body_sha256 text not null,
  header_names text,

  constraint payment_webhook_events_outcome_supported check (
    outcome in ('processed', 'already-processed', 'unrecognized-payment', 'invalid-signature', 'database-failure')
  )
);

comment on table public.payment_webhook_events is
  'Audit log of every webhook delivery attempt, regardless of outcome. Admin-only — never exposed to fans or creators. See lib/payments/webhook-handler.ts.';

create index if not exists payment_webhook_events_received_idx on public.payment_webhook_events (received_at desc);
create index if not exists payment_webhook_events_payment_attempt_idx on public.payment_webhook_events (payment_attempt_id);
create index if not exists payment_webhook_events_provider_event_idx on public.payment_webhook_events (provider_event_id);

alter table public.payment_webhook_events enable row level security;

create policy payment_webhook_events_admin_only
  on public.payment_webhook_events for select
  to authenticated
  using (public.is_admin());

grant select on public.payment_webhook_events to authenticated;

-- No insert/update/delete policy for authenticated at all — this table is
-- only ever written by the webhook handler via the service-role client,
-- the same tightly-scoped path that already writes payment_attempts.
