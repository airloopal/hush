create table if not exists public.creator_categories (
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (creator_id, category_id)
);

comment on table public.creator_categories is
  'Many-to-many creator <-> category associations. At most one row per creator may have is_primary = true (enforced by the partial unique index below).';

-- "A creator can have only one primary category": a partial unique index
-- is the simplest correct way to enforce "at most one true per group" in
-- Postgres.
create unique index if not exists creator_categories_one_primary_per_creator_idx
  on public.creator_categories (creator_id)
  where is_primary;

create index if not exists creator_categories_category_idx on public.creator_categories (category_id);

-- Keep creator_profiles.primary_category_id in sync whenever a category
-- association is marked primary. One-directional by design (this table is
-- the source of truth) to avoid trigger sync loops.
create or replace function public.sync_creator_primary_category()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.is_primary then
    update public.creator_profiles
      set primary_category_id = new.category_id
      where user_id = new.creator_id
        and primary_category_id is distinct from new.category_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_creator_primary_category on public.creator_categories;
create trigger sync_creator_primary_category
  after insert or update of is_primary on public.creator_categories
  for each row
  when (new.is_primary)
  execute function public.sync_creator_primary_category();
