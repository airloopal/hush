alter table public.media_requests enable row level security;

create policy media_requests_select_participant
  on public.media_requests for select
  to authenticated
  using (fan_id = auth.uid() or creator_id = auth.uid());

create policy media_requests_select_staff
  on public.media_requests for select
  to authenticated
  using (public.is_staff());

grant select on public.media_requests to authenticated;
-- No insert/update/delete grant at all — creation, accept/decline,
-- fulfilment, and expiry all happen through the SECURITY DEFINER
-- functions in the next migration. This mirrors the same hardening
-- already applied to conversation_sessions (Sprint L5) and
-- creator_ledger_entries (Sprint L8): a financial state machine should
-- never have a raw client-facing write path.

-- ---------------------------------------------------------------------------
-- Private storage bucket for fulfilled media. public=false — never a
-- permanent public URL; access is only ever via short-lived signed URLs
-- generated server-side after an authorization check (see
-- app/api/media-requests/[id]/signed-url/route.ts).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media-requests', 'media-requests', false, 209715200)
on conflict (id) do nothing;

create policy media_requests_storage_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'media-requests'
    and exists (
      select 1 from public.media_requests mr
      where mr.id::text = (storage.foldername(name))[1]
        and (mr.fan_id = auth.uid() or mr.creator_id = auth.uid() or public.is_staff())
    )
  );

create policy media_requests_storage_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media-requests'
    and exists (
      select 1 from public.media_requests mr
      where mr.id::text = (storage.foldername(name))[1]
        and mr.creator_id = auth.uid()
        and mr.status = 'accepted'
    )
  );

comment on policy media_requests_storage_select on storage.objects is
  'Buyer, the creator, and staff only — never public. See docs/media-requests.md.';
