-- One reusable updated_at trigger function, applied to every table that
-- has an updated_at column. Do not create a second copy of this function
-- for a specific table — attach this same one via a new trigger instead.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Reusable BEFORE UPDATE trigger function: stamps updated_at = now(). Attach to any table with an updated_at column.';
