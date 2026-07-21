create table if not exists public.creator_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status public.creator_status not null default 'draft',
  headline text,
  about text,
  banner_url text,
  primary_category_id uuid references public.categories(id),
  chat_price_minor integer not null default 500,
  photo_price_minor integer not null default 1000,
  video_price_minor integer not null default 2000,
  currency_code text not null default 'USD',
  availability public.availability_status not null default 'offline',
  response_rate numeric,
  average_response_minutes integer,
  completed_conversations_count integer not null default 0,
  returning_fans_count integer not null default 0,
  profile_views_count integer not null default 0,
  total_earnings_minor bigint not null default 0,
  joined_creator_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint creator_profiles_prices_non_negative check (
    chat_price_minor >= 0 and photo_price_minor >= 0 and video_price_minor >= 0
  ),
  constraint creator_profiles_stats_non_negative check (
    completed_conversations_count >= 0
    and returning_fans_count >= 0
    and profile_views_count >= 0
    and total_earnings_minor >= 0
  ),
  constraint creator_profiles_response_rate_range check (
    response_rate is null or (response_rate >= 0 and response_rate <= 100)
  ),
  constraint creator_profiles_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  -- Prices/financials are stored as integer minor units (cents) — see the
  -- money-handling note already established in lib/chat-types.ts.
  constraint creator_profiles_no_self_approval check (approved_by is null or approved_by <> user_id)
);

comment on table public.creator_profiles is
  'Extends profiles for users with role = creator. Approval/aggregate fields are admin-only — protected by a trigger, not just RLS.';
comment on column public.creator_profiles.total_earnings_minor is
  'Integer minor units (cents). Never exposed via the public creator view.';

create index if not exists creator_profiles_status_idx on public.creator_profiles (status);
create index if not exists creator_profiles_availability_idx on public.creator_profiles (availability);
create index if not exists creator_profiles_primary_category_idx on public.creator_profiles (primary_category_id);

drop trigger if exists set_updated_at on public.creator_profiles;
create trigger set_updated_at
  before update on public.creator_profiles
  for each row
  execute function public.set_updated_at();
