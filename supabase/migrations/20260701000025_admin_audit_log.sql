-- §9: audit log for admin actions. Append-only from the application's
-- point of view — no UPDATE/DELETE policy exists for anyone, including
-- staff, so a logged action can never be edited or removed after the
-- fact. Written via log_admin_action() (a SECURITY DEFINER function) so
-- every write goes through one consistent path with a server-side actor
-- check, rather than trusting a client-supplied "admin_id" column.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Append-only record of admin/staff actions — creator approvals, suspensions, payment/withdrawal decisions, moderation outcomes. Written only via log_admin_action(). See docs/admin-portal.md.';

create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor_id, created_at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy admin_audit_log_staff_read
  on public.admin_audit_log for select
  to authenticated
  using (public.is_staff());

grant select on public.admin_audit_log to authenticated;

create or replace function public.log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Only staff may record admin actions.';
  end if;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_metadata)
  returning id into new_id;

  return new_id;
end;
$$;

comment on function public.log_admin_action(text, text, uuid, jsonb) is
  'The only write path for admin_audit_log. Always attributes the action to auth.uid() — never a client-supplied actor.';

revoke all on function public.log_admin_action(text, text, uuid, jsonb) from public;
grant execute on function public.log_admin_action(text, text, uuid, jsonb) to authenticated;
