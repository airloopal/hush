create table if not exists public.creator_favourites (
  fan_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (fan_id, creator_id),
  constraint creator_favourites_no_self_favourite check (fan_id <> creator_id)
);

comment on table public.creator_favourites is 'A fan favouriting a creator. Strictly private to the fan who created it.';

create index if not exists creator_favourites_fan_idx on public.creator_favourites (fan_id);
