-- ============================================================================
-- profiles
-- ============================================================================
alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_admin
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- No general public SELECT policy on this table — a creator's public-safe
-- fields are exposed only through public.public_creator_profiles (see the
-- public creator view migration), never by opening this table itself.

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
  -- role/status immutability for non-admins is enforced by the
  -- protect_profile_role_status trigger, not expressible cleanly here.

create policy profiles_admin_manage
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No client-facing INSERT policy: rows are created only by
-- handle_new_user() (SECURITY DEFINER, runs as table owner, bypasses RLS).

-- ============================================================================
-- creator_profiles
-- ============================================================================
alter table public.creator_profiles enable row level security;

create policy creator_profiles_select_public_approved
  on public.creator_profiles for select
  to anon, authenticated
  using (status = 'approved');

create policy creator_profiles_select_own
  on public.creator_profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy creator_profiles_insert_own
  on public.creator_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy creator_profiles_update_own
  on public.creator_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
  -- Approval/status/aggregate-financial immutability for non-admins is
  -- enforced by protect_creator_profile_admin_fields, not expressible
  -- cleanly here.

create policy creator_profiles_admin_manage
  on public.creator_profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Defense in depth beyond RLS: even though creator_profiles_select_public_
-- approved makes approved ROWS visible, explicitly withhold SELECT on the
-- financial/administrative COLUMNS from anon/authenticated at the grant
-- level. Public/general client code should read through
-- public.public_creator_profiles (next migration) rather than this table
-- directly; this GRANT exists in case something queries the base table.
revoke select on public.creator_profiles from anon, authenticated;
grant select (
  user_id, status, headline, about, banner_url, primary_category_id,
  chat_price_minor, photo_price_minor, video_price_minor, currency_code,
  availability, response_rate, average_response_minutes,
  completed_conversations_count, returning_fans_count, joined_creator_at,
  created_at, updated_at
) on public.creator_profiles to anon, authenticated;
-- total_earnings_minor, profile_views_count, approved_at, approved_by are
-- intentionally excluded from the grant above for anon/authenticated.
grant select on public.creator_profiles to service_role;

-- ============================================================================
-- categories
-- ============================================================================
alter table public.categories enable row level security;

create policy categories_select_active_public
  on public.categories for select
  to anon, authenticated
  using (is_active);

create policy categories_select_admin
  on public.categories for select
  to authenticated
  using (public.is_admin());

create policy categories_admin_manage
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- creator_categories
-- ============================================================================
alter table public.creator_categories enable row level security;

create policy creator_categories_select_public_approved
  on public.creator_categories for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.creator_profiles cp
      where cp.user_id = creator_categories.creator_id
        and cp.status = 'approved'
    )
  );

create policy creator_categories_select_own
  on public.creator_categories for select
  to authenticated
  using (creator_id = auth.uid());

create policy creator_categories_manage_own_while_editable
  on public.creator_categories for all
  to authenticated
  using (
    creator_id = auth.uid()
    and exists (
      select 1 from public.creator_profiles cp
      where cp.user_id = creator_categories.creator_id
        and cp.status in ('draft', 'pending_review')
    )
  )
  with check (
    creator_id = auth.uid()
    and exists (
      select 1 from public.creator_profiles cp
      where cp.user_id = creator_categories.creator_id
        and cp.status in ('draft', 'pending_review')
    )
  );

create policy creator_categories_admin_manage
  on public.creator_categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- creator_favourites
-- ============================================================================
alter table public.creator_favourites enable row level security;

create policy creator_favourites_select_own
  on public.creator_favourites for select
  to authenticated
  using (fan_id = auth.uid());

create policy creator_favourites_insert_own
  on public.creator_favourites for insert
  to authenticated
  with check (fan_id = auth.uid());

create policy creator_favourites_delete_own
  on public.creator_favourites for delete
  to authenticated
  using (fan_id = auth.uid());

-- No admin policy here by design — favourites are private to each fan and
-- not part of moderation tooling scope for this phase.
