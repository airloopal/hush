-- Creates a public.profiles row whenever a new auth.users row is created.
-- SECURITY DEFINER is required here (the invoking session has no INSERT
-- grant on public.profiles), so the search_path is pinned and only safe,
-- narrowly-scoped metadata is trusted from the client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requested_username text;
  normalised_username text;
begin
  -- Only display_name and username are ever taken from client-supplied
  -- signup metadata. role is NEVER read from metadata — every new user is
  -- a fan until an admin promotes them (see docs/supabase-setup.md).
  requested_username := new.raw_user_meta_data ->> 'username';

  if requested_username is not null then
    normalised_username := lower(trim(requested_username));
    if normalised_username !~ '^[a-z0-9_.]{3,30}$' then
      -- Invalid/unusable username supplied at signup: drop it rather than
      -- fail the entire signup. The product can prompt the user to choose
      -- one afterwards (onboarding_completed stays false).
      normalised_username := null;
    elsif exists (select 1 from public.profiles where lower(username) = normalised_username) then
      normalised_username := null; -- already taken; same fallback
    end if;
  end if;

  insert into public.profiles (id, role, username, display_name)
  values (
    new.id,
    'fan',
    normalised_username,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  );

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the profiles row for a new auth user. Always role=fan; never trusts admin/moderator/creator from client metadata.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
