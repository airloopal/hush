-- Phase 2.1B's protect_creator_profile_admin_fields pinned `status` to its
-- previous value for every non-admin UPDATE, with no exception. That's
-- correct for every transition except one: a creator finishing onboarding
-- needs to move their own row from 'draft' to 'pending_review' ("submit
-- for review"). This migration allows exactly that one self-transition
-- and nothing else — draft -> approved/rejected/suspended, or any change
-- once already pending_review/approved/etc., is still admin-only.
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
    return new;
  end if;

  -- UPDATE: allow exactly one self-service status transition —
  -- draft -> pending_review ("submit for review"). Everything else about
  -- status, and every approval/aggregate field, is pinned back to its
  -- previous value.
  if old.status = 'draft' and new.status = 'pending_review' then
    new.status := 'pending_review';
  else
    new.status := old.status;
  end if;

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
