-- Safe, curated public creator discovery surface. Deliberately created
-- WITHOUT `security_invoker`, so it runs with the view owner's privileges
-- (the standard Postgres/Supabase pattern for a view that reads through
-- RLS-protected base tables) — the view itself is what enforces "approved
-- and active only" and "only these columns," not the caller's own RLS
-- visibility into profiles/creator_profiles.
create or replace view public.public_creator_profiles as
select
  cp.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio,
  cp.headline,
  cp.banner_url,
  cp.chat_price_minor,
  cp.photo_price_minor,
  cp.video_price_minor,
  cp.currency_code,
  cp.availability,
  cp.response_rate,
  cp.average_response_minutes,
  cp.completed_conversations_count,
  cp.returning_fans_count,
  cp.joined_creator_at,
  cp.primary_category_id,
  cat.slug as primary_category_slug,
  cat.name as primary_category_name
from public.creator_profiles cp
join public.profiles p on p.id = cp.user_id
left join public.categories cat on cat.id = cp.primary_category_id
where cp.status = 'approved'
  and p.status = 'active';

comment on view public.public_creator_profiles is
  'Curated public discovery surface. Excludes date_of_birth, profile status, approved_by, total_earnings_minor, profile_views_count, email, and any other private/internal field. Only approved creators with an active account appear.';

revoke all on public.public_creator_profiles from public;
grant select on public.public_creator_profiles to anon, authenticated;

-- Each creator's full (non-primary) category list, same "approved + active
-- only" and safe-columns-only guarantee as the view above.
create or replace view public.public_creator_categories as
select
  cc.creator_id,
  cc.category_id,
  cat.slug as category_slug,
  cat.name as category_name,
  cc.is_primary
from public.creator_categories cc
join public.creator_profiles cp on cp.user_id = cc.creator_id
join public.profiles p on p.id = cp.user_id
join public.categories cat on cat.id = cc.category_id
where cp.status = 'approved'
  and p.status = 'active'
  and cat.is_active;

revoke all on public.public_creator_categories from public;
grant select on public.public_creator_categories to anon, authenticated;
