-- Admin & Operations Portal foundation.
-- Adds the 'support' role to the existing user_role enum (additive —
-- moderator/admin/super_admin already existed since Phase 2.1B and their
-- meaning/behavior for every EXISTING table's RLS is unchanged; is_admin()
-- itself is untouched so no existing policy anywhere in the app changes
-- behavior). New, more granular staff-permission helpers are added
-- alongside it for the new admin-portal tables this sprint introduces.

alter type public.user_role add value if not exists 'support';

-- "verify creator" / "remove verification" (§4) is a distinct concept
-- from approval (§4's approve/reject/suspend, from Phase 2.1B) — approval
-- decides whether a creator can operate at all; verification is an
-- additional trust badge layered on top of an already-approved creator.
-- Additive column, defaults false, no change to existing approval logic.
alter table public.creator_profiles
  add column if not exists is_verified boolean not null default false;

comment on column public.creator_profiles.is_verified is
  'Admin-only trust badge, independent of approval status (approve/reject/suspend). Never settable by the creator themselves.';

-- ---------------------------------------------------------------------------
-- Staff permission model
-- ---------------------------------------------------------------------------
-- is_admin() (Phase 2.1B) is deliberately left untouched — every existing
-- RLS policy across the whole app depends on its exact current behavior
-- (true for moderator/admin/super_admin). The functions below are new,
-- used only by this sprint's new admin-portal tables/policies, and let
-- 'support' participate in read-only staff access without touching what
-- is_admin() means anywhere else.

-- True for any staff role, including the new 'support' tier — the
-- broadest "is this person admin-portal staff at all" check.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('support', 'moderator', 'admin', 'super_admin')
  );
$$;

comment on function public.is_staff() is
  'True for support/moderator/admin/super_admin. Broader than is_admin() (which excludes support) — used only by new admin-portal tables, never by any pre-existing RLS policy.';

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- Coarse-grained capability check for the handful of higher-risk actions
-- support should NOT be able to do (approving withdrawals, changing
-- payment status, deleting audit history). moderator/admin/super_admin
-- all pass; support does not. Kept separate from is_admin() (used by
-- existing tables) so this sprint's authorization intent is explicit and
-- auditable at each call site rather than reusing a function whose
-- contract predates the 'support' role's existence.
create or replace function public.is_privileged_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('moderator', 'admin', 'super_admin')
  );
$$;

comment on function public.is_privileged_staff() is
  'True for moderator/admin/super_admin — i.e. everyone except support. Functionally identical to is_admin() today, but named/scoped for this sprint''s admin-portal actions specifically so the two can diverge later without an unrelated-looking rename.';

revoke all on function public.is_privileged_staff() from public;
grant execute on function public.is_privileged_staff() to authenticated;

-- super_admin only — role changes, and any action the brief calls out as
-- especially sensitive.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;
