-- Launch Sprint L5: Day-Pass Payments.
-- Provider-agnostic by design — see lib/payments/provider-adapter.ts.
-- Nothing in this schema encodes a specific payment provider's status
-- strings, header names, or payload shape; "provider" and
-- "provider_status"/"provider_reference" are opaque strings the adapter
-- layer produces and interprets, never trusted for authorization on their
-- own. Never stores card details — Hush never touches a card number.

do $$ begin
  create type public.payment_status as enum ('pending', 'processing', 'paid', 'failed', 'cancelled', 'expired');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid not null references public.profiles(id),
  creator_id uuid not null references public.profiles(id),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  amount_minor integer not null,
  currency text not null default 'USD',
  product_type text not null default 'chat_day_pass',
  internal_status public.payment_status not null default 'pending',
  provider text not null default 'rampex',
  provider_reference text,
  provider_status text,
  client_idempotency_key uuid not null,
  provider_event_id text,
  paid_at timestamptz,
  failure_reason text,
  activated_session_id uuid references public.conversation_sessions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_attempts_amount_positive check (amount_minor > 0),
  constraint payment_attempts_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint payment_attempts_product_type_supported check (product_type = 'chat_day_pass'),
  constraint payment_attempts_fan_creator_distinct check (fan_id <> creator_id),
  constraint payment_attempts_paid_at_consistency check (
    (internal_status = 'paid' and paid_at is not null)
    or (internal_status <> 'paid' and paid_at is null)
  )
);

comment on table public.payment_attempts is
  'One row per checkout attempt. Status is set only by the webhook handler (service-role) — no authenticated client can mark a payment paid. See docs/rampex-payments.md.';
comment on column public.payment_attempts.activated_session_id is
  'Set exactly once, by the webhook handler, when this payment successfully activates a conversation_sessions row — protect_payment_single_activation (below) rejects any attempt to change it once set, guaranteeing one payment can never activate two sessions.';

create unique index if not exists payment_attempts_idempotency_key_unique_idx
  on public.payment_attempts (fan_id, client_idempotency_key);

create unique index if not exists payment_attempts_provider_event_unique_idx
  on public.payment_attempts (provider_event_id)
  where provider_event_id is not null;

create index if not exists payment_attempts_provider_reference_idx on public.payment_attempts (provider_reference);
create index if not exists payment_attempts_fan_idx on public.payment_attempts (fan_id, created_at desc);
create index if not exists payment_attempts_creator_idx on public.payment_attempts (creator_id, created_at desc);
create index if not exists payment_attempts_conversation_idx on public.payment_attempts (conversation_id);

drop trigger if exists set_updated_at on public.payment_attempts;
create trigger set_updated_at
  before update on public.payment_attempts
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Server-side price authority, enforced at the database level too: the
-- amount is always recomputed from the creator's CURRENT chat_price_minor
-- at insert time, never trusted from whatever the inserting code passed
-- in. Defense in depth on top of the application-layer PaymentService
-- also never trusting a client-supplied amount.
-- ---------------------------------------------------------------------------
create or replace function public.protect_payment_amount()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_price integer;
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  select chat_price_minor into current_price
    from public.creator_profiles
    where user_id = new.creator_id and status = 'approved';

  if current_price is null then
    raise exception 'Cannot start checkout — this creator is not currently approved.';
  end if;

  new.amount_minor := current_price;
  new.currency := 'USD';
  return new;
end;
$$;

drop trigger if exists protect_payment_amount on public.payment_attempts;
create trigger protect_payment_amount
  before insert on public.payment_attempts
  for each row
  execute function public.protect_payment_amount();

-- "The same payment cannot activate multiple sessions" — once
-- activated_session_id is set, it can never change (including to NULL).
create or replace function public.protect_payment_single_activation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.activated_session_id is not null and new.activated_session_id is distinct from old.activated_session_id then
    raise exception 'This payment has already activated a session and cannot activate another.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_payment_single_activation on public.payment_attempts;
create trigger protect_payment_single_activation
  before update on public.payment_attempts
  for each row
  execute function public.protect_payment_single_activation();
