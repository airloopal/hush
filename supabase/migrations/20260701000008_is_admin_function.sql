-- Returns true only for moderator/admin/super_admin. SECURITY DEFINER so it
-- can read public.profiles even from inside another table's RLS policy
-- without that policy needing its own visibility into profiles (which
-- would otherwise require a profiles SELECT policy broad enough to create
-- recursive RLS evaluation). search_path is pinned to avoid a hijacked
-- function/table shadowing this definer function's queries.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('moderator', 'admin', 'super_admin')
  );
$$;

comment on function public.is_admin() is
  'True for moderator/admin/super_admin only. SECURITY DEFINER + pinned search_path to avoid recursive RLS evaluation and search_path hijacking.';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;
