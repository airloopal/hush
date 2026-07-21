create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  is_adult boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.categories is 'Creator category taxonomy (Lifestyle, Gaming, 18+, etc).';

create unique index if not exists categories_slug_unique_idx on public.categories (slug);
create index if not exists categories_active_sort_idx on public.categories (is_active, sort_order);

drop trigger if exists set_updated_at on public.categories;
create trigger set_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at();

-- Idempotent seed: safe to re-run on every deploy. Uses slug as the
-- natural key; existing rows are updated in place rather than duplicated.
insert into public.categories (name, slug, is_adult, sort_order)
values
  ('Lifestyle', 'lifestyle', false, 1),
  ('Music', 'music', false, 2),
  ('Fitness', 'fitness', false, 3),
  ('Gaming', 'gaming', false, 4),
  ('Fashion', 'fashion', false, 5),
  ('Sport', 'sport', false, 6),
  ('Business', 'business', false, 7),
  ('Education', 'education', false, 8),
  ('Art', 'art', false, 9),
  ('18+', 'adult-18-plus', true, 10)
on conflict (slug) do update
  set name = excluded.name,
      is_adult = excluded.is_adult,
      sort_order = excluded.sort_order,
      updated_at = now();
