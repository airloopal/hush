-- Sprint L8: Creator Earnings & Payouts — foundation.
--
-- The 'support' role, is_verified, and is_staff()/is_privileged_staff()
-- already exist as of 20260701000024_admin_portal_rbac_foundation.sql —
-- this migration deliberately does not redefine any of them (per the
-- brief's "do not duplicate functionality already implemented by the
-- Admin Portal"). Everything below is genuinely new to this sprint.

-- ---------------------------------------------------------------------------
-- Centrally configurable business-model values (never scattered constants).
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

comment on table public.platform_settings is
  'Single source of truth for platform-wide financial defaults. Read via lib/payments/commission-service.ts — nothing else should hardcode these values.';

insert into public.platform_settings (key, value) values
  ('default_commission_bps', '2000'),
  ('minimum_payout_minor', '5000'),
  ('minimum_payout_currency', '"USD"'),
  ('settlement_hold_hours', '48')
on conflict (key) do nothing;

drop trigger if exists set_updated_at on public.platform_settings;
create trigger set_updated_at
  before update on public.platform_settings
  for each row
  execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

create policy platform_settings_select_all
  on public.platform_settings for select
  to authenticated
  using (true);

create policy platform_settings_update_privileged_staff
  on public.platform_settings for update
  to authenticated
  using (public.is_privileged_staff())
  with check (public.is_privileged_staff());

grant select on public.platform_settings to authenticated;
grant update (value, updated_at, updated_by) on public.platform_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Commission tiers (§4 priority 2) + per-creator override (§4 priority 1),
-- including Founding Creator support (10% for an individual creator
-- without touching global config).
-- ---------------------------------------------------------------------------
create table if not exists public.creator_commission_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  commission_bps integer not null,
  created_at timestamptz not null default now(),

  constraint creator_commission_tiers_bps_range check (commission_bps >= 0 and commission_bps <= 10000)
);

comment on table public.creator_commission_tiers is
  'Named commission programmes (e.g. "Founding Creator" at 1000 bps = 10%) a creator can be assigned to — priority 2 in the commission resolution order. See lib/payments/commission-service.ts.';

insert into public.creator_commission_tiers (name, commission_bps) values
  ('Founding Creator', 1000)
on conflict (name) do nothing;

alter table public.creator_commission_tiers enable row level security;

create policy creator_commission_tiers_select_all
  on public.creator_commission_tiers for select
  to authenticated
  using (true);

create policy creator_commission_tiers_manage_privileged_staff
  on public.creator_commission_tiers for all
  to authenticated
  using (public.is_privileged_staff())
  with check (public.is_privileged_staff());

grant select on public.creator_commission_tiers to authenticated;
grant insert, update, delete on public.creator_commission_tiers to authenticated;

alter table public.creator_profiles
  add column if not exists commission_tier_id uuid references public.creator_commission_tiers(id),
  add column if not exists commission_rate_bps integer;

alter table public.creator_profiles
  add constraint creator_profiles_commission_rate_range
  check (commission_rate_bps is null or (commission_rate_bps >= 0 and commission_rate_bps <= 10000));

comment on column public.creator_profiles.commission_rate_bps is
  'Direct per-creator override (§4 priority 1) — e.g. a Founding Creator arrangement without a shared tier. Takes priority over commission_tier_id, which takes priority over platform_settings.default_commission_bps. Never settable by the creator themselves — protected by protect_creator_profile_admin_fields, extended below.';

-- Extend the existing admin-fields trigger (Phase 2.1B) to also pin the
-- two new commission columns — same function, same established pattern:
-- silently reset to the previous/default value for a non-admin caller
-- rather than erroring, so a creator saving their headline/pricing
-- alongside a stale copy of these fields doesn't fail.
create or replace function public.protect_creator_profile_admin_fields()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.approved_at := null;
    new.approved_by := null;
    new.completed_conversations_count := 0;
    new.returning_fans_count := 0;
    new.profile_views_count := 0;
    new.total_earnings_minor := 0;
    new.response_rate := null;
    new.average_response_minutes := null;
    new.commission_tier_id := null;
    new.commission_rate_bps := null;
    return new;
  end if;

  new.status := old.status;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  new.completed_conversations_count := old.completed_conversations_count;
  new.returning_fans_count := old.returning_fans_count;
  new.profile_views_count := old.profile_views_count;
  new.total_earnings_minor := old.total_earnings_minor;
  new.response_rate := old.response_rate;
  new.average_response_minutes := old.average_response_minutes;
  new.commission_tier_id := old.commission_tier_id;
  new.commission_rate_bps := old.commission_rate_bps;
  return new;
end;
$$;
