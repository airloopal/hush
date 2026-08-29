-- Sprint L12: Scheduled Maintenance.
-- Automates the two existing lazy-sweep functions
-- (settle_matured_ledger_entries — Sprint L8, expire_stale_media_requests
-- — Sprint L9) via pg_cron where available. Neither function's body is
-- modified — both are already idempotent by design (a plain UPDATE with
-- a status-scoped WHERE clause; a reversal guarded by
-- refund_media_request's own "already reversed" check), which is what
-- makes them safe to run on a schedule and safe if two runs ever
-- overlap. This migration only adds: a thin logging+locking wrapper
-- around each, the cron schedule itself, and a minimal run-history table
-- for operational visibility — no dashboard.

create table if not exists public.maintenance_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  success boolean,
  detail text,
  error_message text
);

comment on table public.maintenance_job_runs is
  'Minimal run history for scheduled maintenance jobs (Sprint L12) — job name, timing, success/failure, and a short detail/error string. Not a monitoring dashboard: just enough to answer "did the last run succeed, and when."';

create index if not exists maintenance_job_runs_job_started_idx on public.maintenance_job_runs (job_name, started_at desc);

alter table public.maintenance_job_runs enable row level security;

create policy maintenance_job_runs_staff_read
  on public.maintenance_job_runs for select
  to authenticated
  using (public.is_staff());

grant select on public.maintenance_job_runs to authenticated;

-- ---------------------------------------------------------------------------
-- Wrappers: record start/finish, guard against overlapping runs of the
-- SAME job with a transaction-scoped advisory lock, and never let a
-- failure in the underlying function raise out uncaught — it's logged
-- instead.
--
-- Neither the underlying functions nor these wrappers are granted to
-- `authenticated` — a scheduled pg_cron job runs with the privileges of
-- the role that scheduled it (the database owner in Supabase, which
-- bypasses grants entirely), so no client-facing execute grant is
-- needed, and per the brief, these privileged maintenance functions must
-- not become publicly callable. (Previously
-- settle_matured_ledger_entries/expire_stale_media_requests *were*
-- granted to authenticated, from when they were meant to be triggered
-- opportunistically by any client — nothing in the app ever actually
-- called them that way, so revoking is safe.)
-- ---------------------------------------------------------------------------
revoke execute on function public.settle_matured_ledger_entries() from authenticated;
revoke execute on function public.expire_stale_media_requests() from authenticated;

create or replace function public.run_scheduled_settlement()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_run_id uuid;
  v_got_lock boolean;
begin
  v_got_lock := pg_try_advisory_xact_lock(hashtext('run_scheduled_settlement'));
  if not v_got_lock then
    insert into public.maintenance_job_runs (job_name, finished_at, success, detail)
    values ('settle_matured_ledger_entries', now(), true, 'skipped — previous run still in progress');
    return;
  end if;

  insert into public.maintenance_job_runs (job_name) values ('settle_matured_ledger_entries') returning id into v_run_id;

  begin
    perform public.settle_matured_ledger_entries();
    update public.maintenance_job_runs
      set finished_at = now(), success = true, detail = 'completed'
      where id = v_run_id;
  exception when others then
    update public.maintenance_job_runs
      set finished_at = now(), success = false, error_message = sqlerrm
      where id = v_run_id;
  end;
end;
$$;

revoke all on function public.run_scheduled_settlement() from public;

create or replace function public.run_scheduled_media_expiry()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_run_id uuid;
  v_got_lock boolean;
begin
  v_got_lock := pg_try_advisory_xact_lock(hashtext('run_scheduled_media_expiry'));
  if not v_got_lock then
    insert into public.maintenance_job_runs (job_name, finished_at, success, detail)
    values ('expire_stale_media_requests', now(), true, 'skipped — previous run still in progress');
    return;
  end if;

  insert into public.maintenance_job_runs (job_name) values ('expire_stale_media_requests') returning id into v_run_id;

  begin
    perform public.expire_stale_media_requests();
    update public.maintenance_job_runs
      set finished_at = now(), success = true, detail = 'completed'
      where id = v_run_id;
  exception when others then
    update public.maintenance_job_runs
      set finished_at = now(), success = false, error_message = sqlerrm
      where id = v_run_id;
  end;
end;
$$;

revoke all on function public.run_scheduled_media_expiry() from public;

-- ---------------------------------------------------------------------------
-- Scheduling. Frequencies chosen against each function's own existing
-- rule, not arbitrary:
-- - settle_matured_ledger_entries: entries mature after
--   platform_settings.settlement_hold_hours (currently 48h) — being off
--   by up to an hour on when a balance becomes visibly "available" is
--   immaterial, so hourly is frequent enough with negligible overhead.
-- - expire_stale_media_requests: an accepted request's fulfilment window
--   is 24h (see accept_media_request), and a fan is left waiting on a
--   refund until this runs — more time-sensitive, so every 15 minutes
--   keeps the worst-case delay small without being wasteful.
--
-- Guarded for environments without the pg_cron extension (this sandbox's
-- local Postgres, and any fresh local Postgres used for testing) —
-- skipped with a NOTICE rather than failing the migration. Production
-- Supabase has pg_cron available but it must be enabled via the
-- Dashboard first — see docs/scheduled-maintenance.md.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'hush-settle-matured-ledger-entries';
    perform cron.unschedule(jobid) from cron.job where jobname = 'hush-expire-stale-media-requests';

    perform cron.schedule(
      'hush-settle-matured-ledger-entries',
      '0 * * * *',
      $cron$select public.run_scheduled_settlement();$cron$
    );
    perform cron.schedule(
      'hush-expire-stale-media-requests',
      '*/15 * * * *',
      $cron$select public.run_scheduled_media_expiry();$cron$
    );
  else
    raise notice 'pg_cron extension not installed — skipping schedule creation. See docs/scheduled-maintenance.md for production setup via the Supabase Dashboard.';
  end if;
end $$;
