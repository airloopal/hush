-- Sprint L9: Paid Live Photo & Video Requests.
-- Reuses payment_attempts (extends product_type), the L8 ledger/commission
-- engine, conversations, and existing RBAC/audit infrastructure — no
-- parallel payment or earnings system.

do $$ begin
  create type public.media_request_type as enum ('live_photo', 'live_video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_request_status as enum (
    'pending_payment', 'pending_creator', 'accepted', 'fulfilled', 'declined', 'expired', 'refund_required'
  );
exception when duplicate_object then null; end $$;

alter table public.payment_attempts drop constraint if exists payment_attempts_product_type_supported;
alter table public.payment_attempts add constraint payment_attempts_product_type_supported
  check (product_type in ('chat_day_pass', 'live_photo', 'live_video'));

create table if not exists public.media_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  fan_id uuid not null references public.profiles(id),
  creator_id uuid not null references public.profiles(id),
  request_type public.media_request_type not null,
  amount_minor integer not null,
  currency text not null,
  status public.media_request_status not null default 'pending_payment',
  payment_attempt_id uuid references public.payment_attempts(id),
  storage_path text,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  fulfilled_at timestamptz,
  expires_at timestamptz,
  decline_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint media_requests_amount_positive check (amount_minor > 0),
  constraint media_requests_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint media_requests_fan_creator_distinct check (fan_id <> creator_id)
);

comment on table public.media_requests is
  'Paid live photo/video requests within an existing conversation. One payment_attempts row per request (product_type live_photo/live_video) — reuses Sprint L5''s payment architecture and Sprint L8''s ledger/commission engine, not a parallel system.';

create unique index if not exists media_requests_one_per_payment_idx
  on public.media_requests (payment_attempt_id)
  where payment_attempt_id is not null;

create index if not exists media_requests_conversation_idx on public.media_requests (conversation_id, created_at desc);
create index if not exists media_requests_creator_status_idx on public.media_requests (creator_id, status);
create index if not exists media_requests_fan_idx on public.media_requests (fan_id, created_at desc);

drop trigger if exists set_updated_at on public.media_requests;
create trigger set_updated_at
  before update on public.media_requests
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Server-side price authority for media requests too — same pattern as
-- protect_payment_amount (Sprint L5), extended rather than duplicated: the
-- trigger now looks at product_type to pick the right creator price
-- column, still always reading the CURRENT, approved creator's price.
-- ---------------------------------------------------------------------------
create or replace function public.protect_payment_amount()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  target_creator record;
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  select chat_price_minor, photo_price_minor, video_price_minor into target_creator
    from public.creator_profiles
    where user_id = new.creator_id and status = 'approved';

  if target_creator is null then
    raise exception 'Cannot start checkout — this creator is not currently approved.';
  end if;

  new.amount_minor := case new.product_type
    when 'live_photo' then target_creator.photo_price_minor
    when 'live_video' then target_creator.video_price_minor
    else target_creator.chat_price_minor
  end;
  new.currency := 'USD';
  return new;
end;
$$;
