-- RLS policies can restrict which ROWS a user can write, but not "this
-- specific column may never change except by an admin" — that needs a
-- trigger that can compare OLD vs NEW. Both triggers below are permissive
-- for admins (is_admin() short-circuits the check) and only constrain
-- everyone else.

create or replace function public.protect_profile_role_status()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  -- Trusted server-side contexts (the service-role key, or a database
  -- administrator working directly via the SQL editor/psql as the
  -- `postgres` role) bypass this guard by design — this is the only way
  -- to promote the very first admin, since nobody can pass is_admin() yet
  -- at that point. End-user sessions always run as `authenticated`/`anon`
  -- and can never reach this branch. See docs/supabase-setup.md for the
  -- documented bootstrap procedure.
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only an admin may change a profile''s role.';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Only an admin may change a profile''s status.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_status on public.profiles;
create trigger protect_profile_role_status
  before update on public.profiles
  for each row
  execute function public.protect_profile_role_status();

-- Creators may edit their own headline/about/pricing/etc, but never their
-- own approval fields, status, or aggregate/financial statistics.
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
    -- A creator inserting their own row always starts in draft, with no
    -- approval or aggregate data — regardless of what the client sent.
    new.status := 'draft';
    new.approved_at := null;
    new.approved_by := null;
    new.completed_conversations_count := 0;
    new.returning_fans_count := 0;
    new.profile_views_count := 0;
    new.total_earnings_minor := 0;
    new.response_rate := null;
    new.average_response_minutes := null;
    return new;
  end if;

  -- UPDATE: silently pin every admin-only field back to its previous value
  -- rather than erroring, so a client saving an editable field (e.g.
  -- headline) alongside a stale copy of protected fields doesn't fail.
  new.status := old.status;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  new.completed_conversations_count := old.completed_conversations_count;
  new.returning_fans_count := old.returning_fans_count;
  new.profile_views_count := old.profile_views_count;
  new.total_earnings_minor := old.total_earnings_minor;
  new.response_rate := old.response_rate;
  new.average_response_minutes := old.average_response_minutes;
  return new;
end;
$$;

drop trigger if exists protect_creator_profile_admin_fields on public.creator_profiles;
create trigger protect_creator_profile_admin_fields
  before insert or update on public.creator_profiles
  for each row
  execute function public.protect_creator_profile_admin_fields();
