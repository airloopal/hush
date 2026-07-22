-- Launch Sprint L3: Conversation & Session Engine.
-- Deliberately no `messages` table yet — this sprint is conversation/
-- session lifecycle only ("do not implement realtime messaging yet").
-- canUserMessage() (see migration 20260701000017) is the guard a future
-- message-sending endpoint must call; nothing calls it yet.

do $$ begin
  create type public.conversation_session_status as enum ('pending', 'active', 'expired', 'refunded');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  fan_id uuid not null references public.profiles(id) on delete cascade,
  latest_message_at timestamptz,
  latest_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint conversations_creator_fan_distinct check (creator_id <> fan_id)
);

comment on table public.conversations is
  'One row per fan/creator pair — reused across unlocks and renewals (see conversation_sessions for the 24-hour access windows). Never deleted on expiry; "archived" is a fan-only visibility flag, not a data deletion.';

-- One conversation per fan/creator pair — unlocking again reuses it
-- (createConversation is get-or-create, see lib/repositories).
create unique index if not exists conversations_creator_fan_unique_idx
  on public.conversations (creator_id, fan_id);

create index if not exists conversations_fan_latest_idx
  on public.conversations (fan_id, latest_message_at desc nulls last);
create index if not exists conversations_creator_latest_idx
  on public.conversations (creator_id, latest_message_at desc nulls last);

drop trigger if exists set_updated_at on public.conversations;
create trigger set_updated_at
  before update on public.conversations
  for each row
  execute function public.set_updated_at();

create table if not exists public.conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status public.conversation_session_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint conversation_sessions_expiry_after_activation check (expires_at > activated_at)
);

comment on table public.conversation_sessions is
  'One row per 24-hour access window. Renewing INSERTs a new row — existing rows are never overwritten, so full unlock/renewal history is preserved per conversation. "status" is the recorded intent (pending/active/refunded); whether a session is *currently* active for gating purposes is always also re-checked against expires_at at read time (see ConversationSessionService.isActive), since nothing here runs a background job — see expireSessions() for the lazy sweep that keeps the stored status caught up for history/display purposes.';

-- Fast "does this conversation have an active session" lookup — the most
-- common query on this table by far.
create index if not exists conversation_sessions_conversation_status_idx
  on public.conversation_sessions (conversation_id, status, expires_at desc);

drop trigger if exists set_updated_at on public.conversation_sessions;
create trigger set_updated_at
  before update on public.conversation_sessions
  for each row
  execute function public.set_updated_at();
