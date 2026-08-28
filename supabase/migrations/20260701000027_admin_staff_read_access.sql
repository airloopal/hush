-- The existing admin policies on these tables all use is_admin(), which
-- (correctly, for its original purpose) excludes the new 'support' role.
-- The admin portal's dashboard/search/list views need support to have
-- read visibility even though they can't take the higher-risk actions
-- moderator/admin/super_admin can — these policies add exactly that: SELECT
-- only, using is_staff() (support included), alongside the existing
-- is_admin()-based FOR ALL policies (which still fully cover
-- moderator/admin/super_admin's read+write access; nothing about them
-- changes).

create policy profiles_staff_read
  on public.profiles for select
  to authenticated
  using (public.is_staff());

create policy creator_profiles_staff_read
  on public.creator_profiles for select
  to authenticated
  using (public.is_staff());

create policy payment_attempts_staff_read
  on public.payment_attempts for select
  to authenticated
  using (public.is_staff());

create policy conversation_sessions_staff_read
  on public.conversation_sessions for select
  to authenticated
  using (public.is_staff());

create policy conversations_staff_read
  on public.conversations for select
  to authenticated
  using (public.is_staff());

create policy payment_webhook_events_staff_read
  on public.payment_webhook_events for select
  to authenticated
  using (public.is_staff());

-- Idempotent — payment_webhook_events already had this grant, the others
-- already have a SELECT grant to authenticated from earlier migrations
-- (RLS row-visibility is additive across policies on the same table, so
-- the new policies above take effect automatically once the grant
-- exists).
grant select on public.payment_webhook_events to authenticated;
