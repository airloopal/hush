-- RLS policies restrict which ROWS a role can see/write; they don't by
-- themselves grant the underlying SELECT/INSERT/UPDATE/DELETE privilege.
-- Without the GRANTs below, anon/authenticated get "permission denied"
-- before RLS is even evaluated. Each grant here matches (and is further
-- narrowed by) the corresponding RLS policies from the earlier migration.

grant usage on schema public to anon, authenticated;

-- profiles: never publicly readable; authenticated users read/update only
-- their own row (RLS-enforced), role/status additionally protected by the
-- protect_profile_role_status trigger.
grant select, update on public.profiles to authenticated;

-- categories: publicly readable when active; writes are attempted by
-- authenticated (the RLS categories_admin_manage policy actually allows
-- them through only for admins).
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

-- creator_profiles: column-level SELECT grants for anon/authenticated were
-- already set in the RLS migration (deliberately excluding financial/
-- internal columns). INSERT/UPDATE are needed so a creator can create/edit
-- their own row; RLS + the protective trigger narrow what that actually
-- allows.
grant insert, update on public.creator_profiles to authenticated;

-- creator_categories: publicly readable for approved creators; authenticated
-- users can attempt writes, narrowed by RLS to their own rows while
-- draft/pending, or admins.
grant select on public.creator_categories to anon, authenticated;
grant insert, update, delete on public.creator_categories to authenticated;

-- creator_favourites: never public. Only authenticated fans, and only
-- their own rows (RLS-enforced) — no UPDATE, favourites are add/remove
-- only.
grant select, insert, delete on public.creator_favourites to authenticated;
