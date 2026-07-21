-- public.profiles: one row per auth.users row (1:1, same primary key).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'fan',
  username text,
  display_name text,
  avatar_url text,
  bio text,
  status public.profile_status not null default 'active',
  date_of_birth date,
  country_code text,
  timezone text,
  last_seen_at timestamptz,
  onboarding_completed boolean not null default false,
  adult_content_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Stored lowercase always — the unique index below is belt-and-suspenders
  -- in case a future code path forgets to lowercase before insert/update.
  constraint profiles_username_lowercase check (username is null or username = lower(username)),
  -- Letters, numbers, underscores, periods only. Length 3–30: a superset of
  -- the current frontend's stricter 3–20/no-periods rule (see
  -- lib/validation.ts) — the database is intentionally the outer bound, not
  -- the primary source of truth for the exact product rule.
  constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9_.]{3,30}$'
  ),
  constraint profiles_country_code_format check (
    country_code is null or country_code ~ '^[A-Z]{2}$'
  )
);

comment on table public.profiles is
  'One row per authenticated user. role/status are protected — see the protect_profile_role_status trigger and RLS policies.';
comment on column public.profiles.date_of_birth is
  'Never exposed publicly — not selectable via the public creator view or any anon-facing query.';

-- Case-insensitive uniqueness (redundant with the lowercase CHECK above,
-- but enforced independently at the index level).
create unique index if not exists profiles_username_unique_lower_idx
  on public.profiles (lower(username))
  where username is not null;

create index if not exists profiles_role_status_idx on public.profiles (role, status);

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();
