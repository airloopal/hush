-- Launch Sprint L4: Production Realtime Messaging.
-- Text messages only this sprint (message_type is constrained to 'text').
-- Soft-deletion fields (deleted_at) are schema-only — no edit/delete UI.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  message_type text not null default 'text',
  client_message_id uuid,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,

  constraint messages_body_not_blank check (length(btrim(body)) > 0),
  -- Sensible maximum — matches the composer's existing character limit
  -- convention elsewhere in the product.
  constraint messages_body_max_length check (char_length(body) <= 4000),
  constraint messages_type_supported check (message_type = 'text')
);

comment on table public.messages is
  'Persistent conversation messages. Sender participation, active-session, and creator-approval are all re-checked by a trigger at insert time (protect_message_send) in addition to RLS.';
comment on column public.messages.client_message_id is
  'Client-generated id for idempotent retries — paired with sender_id in a unique index so the same optimistic send can never persist twice.';

-- Idempotent retries: the same (sender, client_message_id) can only ever
-- insert once. Partial index — rows without a client_message_id (none
-- expected from the app, but the column is nullable per spec) aren't
-- constrained by this.
create unique index if not exists messages_sender_client_id_unique_idx
  on public.messages (sender_id, client_message_id)
  where client_message_id is not null;

-- The one query every part of this feature runs constantly: "this
-- conversation's messages, oldest to newest, paginated."
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_message_id uuid references public.messages(id),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

comment on table public.conversation_reads is
  'One row per (conversation, participant) — the latest message that participant has seen. Unread counts are derived by comparing this against messages.created_at, never a per-message read flag.';

create index if not exists conversation_reads_user_idx on public.conversation_reads (user_id);

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz,
  last_active_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.user_presence is
  'System-derived presence only — see touch_presence() (next migration), the only write path. A user can never set this directly. Never treat a presence row as proof of authorization for anything.';

-- ---------------------------------------------------------------------------
-- Defense in depth: re-verify participation/session/approval at INSERT
-- time, the same layered pattern already used for conversations/sessions
-- (see 20260701000016_conversation_security.sql). RLS (next migration)
-- covers the row-visibility half of this; this trigger covers what RLS
-- can't express cleanly (multi-table business rules) and gives a clear
-- error message instead of an opaque RLS denial.
-- ---------------------------------------------------------------------------
create or replace function public.protect_message_send()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  target_conversation record;
  target_creator_status public.creator_status;
  target_sender_status public.profile_status;
  has_active_session boolean;
  recent_message_count integer;
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  select * into target_conversation from public.conversations where id = new.conversation_id;
  if target_conversation is null then
    raise exception 'Conversation not found.';
  end if;
  if new.sender_id <> target_conversation.fan_id and new.sender_id <> target_conversation.creator_id then
    raise exception 'Only a participant in this conversation may send a message.';
  end if;
  if auth.uid() is null or auth.uid() <> new.sender_id then
    raise exception 'Cannot send a message on behalf of another user.';
  end if;

  select p.status into target_sender_status from public.profiles p where p.id = new.sender_id;
  if target_sender_status is null or target_sender_status <> 'active' then
    raise exception 'Your account must be active to send a message.';
  end if;

  select cp.status into target_creator_status
    from public.creator_profiles cp where cp.user_id = target_conversation.creator_id;
  if target_creator_status is null or target_creator_status <> 'approved' then
    raise exception 'This creator is not currently approved for messaging.';
  end if;

  select exists (
    select 1 from public.conversation_sessions cs
    where cs.conversation_id = new.conversation_id
      and cs.status = 'active'
      and cs.expires_at > now()
  ) into has_active_session;
  if not has_active_session then
    raise exception 'Chat access has expired for this conversation.';
  end if;

  -- Server-authoritative rate limit: at most 20 messages from this sender,
  -- in this conversation, in a rolling 60-second window. Deliberately
  -- generous for real conversational back-and-forth while stopping
  -- automated spam — see docs/realtime-messaging.md "Rate limiting" for
  -- the rationale and how to tune it.
  select count(*) into recent_message_count
    from public.messages m
    where m.conversation_id = new.conversation_id
      and m.sender_id = new.sender_id
      and m.created_at > now() - interval '60 seconds';
  if recent_message_count >= 20 then
    raise exception 'You are sending messages too quickly. Please wait a moment and try again.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_message_send on public.messages;
create trigger protect_message_send
  before insert on public.messages
  for each row
  execute function public.protect_message_send();
