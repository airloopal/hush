# Conversation & Session Engine (Launch Sprint L3)

## What this sprint built

A production conversation/session engine — schema, repositories, and a
service layer — for 24-hour access management. Explicitly **not** built
here, per the sprint brief: real-time delivery, typing indicators, read
receipts, payment processing (Rampex), or an actual message-sending
endpoint. `canUserMessage()` exists specifically so that endpoint has a
ready, already-reviewed gate to call when it's built.

## Conversation lifecycle

```
Fan unlocks a creator (mocked purchase)
        │
        ▼
ConversationService.unlock(fanId, creatorId)
        │
        ├─ conversation exists? → reuse it (createConversation is get-or-create)
        └─ else → INSERT conversations row
                   (blocked at the database level unless the creator is
                    currently 'approved' and the fan's account is 'active'
                    — see protect_conversation_creation, migration 016)
        │
        ▼
ConversationSessionService.activate(conversationId)
        │
        ▼
   INSERT conversation_sessions row (status='active', expires_at = now()+24h)
```

A `conversations` row is permanent — it's never deleted when access
expires. It's the fan/creator relationship; `conversation_sessions` rows
are the individual 24-hour windows within it.

## Session lifecycle

```
        pending ──────► active ──────► expired
                            │              ▲
                            │              │ (lazy sweep, see below)
                            └── refunded ──┘ (admin-only, not built yet)
```

- **Created** via `ConversationSessionService.activate()` (first unlock) or
  `.renew()` (any later one) — both call the same repository method
  (`createSession`), which always **inserts a new row**. Previous sessions
  are never overwritten, so the full unlock/renewal history for a
  conversation is preserved.
- **"Active" is never trusted from the stored `status` column alone.**
  `ConversationSessionService.isActive()` — the one place this check
  happens — requires *both* `status = 'active'` *and* `expires_at >
  now()`. This matters because nothing in this sprint runs a background
  job; the stored status can go stale between the moment a session
  actually expires and the next time something sweeps it.
- **The lazy sweep** (`expire_conversation_sessions(conversation_id)`, a
  `SECURITY DEFINER` RPC) flips any of one conversation's `pending`/`active`
  sessions whose `expires_at` has passed to `expired`. It's scoped to a
  single conversation and callable by either participant (or an admin/
  service-role for any conversation) — see migration
  `20260701000017_expire_sessions_function.sql`. `getActiveSession()` calls
  it automatically before reading, so the stored status is at most one
  read-call stale in practice, even without a cron job.

## Renewals

A renewal is not a special case in the data model — it's exactly the same
`createSession()` call as the first unlock, on an existing conversation
whose previous session has expired. `ConversationSessionService.renew()`
exists as a distinctly-named method purely for call-site clarity (the UI
says "Renew," so the code that handles that click should too), but it's a
one-line wrapper over the same repository method as `activate()`.

## Expiry, from the UI's point of view

- **Countdown**: `ConversationSessionService.getRemainingMs()` +
  `.formatCountdown()` produce the "23h 12m" style already used by
  `components/countdown.tsx` (intentionally mirrored, not shared code yet
  — see Known remaining work).
- **On expiry**: the existing demo UI's behavior is the product spec this
  sprint preserves — composer replaced with a "Chat access has ended" /
  "Unlock Another 24 Hours" prompt, conversation history remains visible,
  media purchase buttons disabled. See `app/chats/[username]/page.tsx`
  (demo mode; still the only mode this specific page is wired to — see
  below) for the reference implementation of exactly this behavior.

## `canUserMessage()` — the guard for a future message endpoint

`lib/services/can-user-message.ts`. Returns `{ allowed, reason? }`, never
just a boolean, so a future endpoint can return a specific, honest error
rather than a generic 403. Checks, in order: authenticated → participant
in this conversation → account active → creator approved → active session
(via `ConversationSessionService.isActive`). Split into a pure
`evaluateCanUserMessage(facts)` (fully unit-testable, no I/O) and an async
`canUserMessage(userId, conversationId, deps)` wrapper that gathers those
facts for a real call site. **Nothing calls this yet** — there is no
message-sending endpoint in this sprint.

## Security

Enforced at the database level (defense in depth beyond RLS, same pattern
as the profiles/creators schema — see `docs/profiles-and-creators-schema.md`):

- **RLS**: a user can only ever see conversations/sessions where they're
  `fan_id` or `creator_id` (or they're an admin). No `USING (true)`
  anywhere.
- **No client-facing `UPDATE` on `conversation_sessions` at all** —
  status transitions to `expired` only happen through the scoped
  `expire_conversation_sessions()` RPC; refunds are admin-only
  (`conversation_sessions_admin_manage`), with no self-service refund
  flow built yet.
- **Draft/rejected/suspended creators cannot receive new conversations**:
  `protect_conversation_creation` (trigger) checks `creator_profiles.status
  = 'approved'` on every `INSERT`.
- **Suspended/banned fans cannot start conversations**:
  same trigger checks `profiles.status = 'active'` for the fan.
- **Both checks re-run on every renewal, not just first creation**
  (`protect_session_creation`) — a creator approved when the conversation
  started could have since been suspended.
- **Cross-user isolation verified against a real Postgres 16 instance**
  this sprint: a second fan gets zero rows querying another fan's
  conversations; direct client `UPDATE` on `conversation_sessions` is
  denied outright; a draft creator's `INSERT` is rejected; a suspended
  fan's `INSERT` is rejected; renewal produces two distinct rows with the
  older one correctly left `expired`, not overwritten.

## Future Rampex integration point

`ConversationService.unlock(fanId, creatorId, durationHours)` is the
single place a real payment confirmation should call into once Rampex (or
any payment provider) is integrated — today it's called directly on
"mock purchase success," with no payment verification in between. A real
integration inserts a payment-confirmation step *before* this call (or
makes session creation itself conditional on a webhook-confirmed charge),
without needing to change anything about how conversations/sessions are
modeled.

## Future realtime integration point

`ConversationRepository.updateLatestMessage()` and the (unimplemented)
`MessageRepository`/`MessagingService` are where a real message-sending
endpoint would write. Once messages are real, `canUserMessage()` is the
gate that endpoint calls before writing, and a realtime layer (Supabase
Realtime, a WebSocket server, etc.) would subscribe to that table for live
delivery — nothing about the conversation/session engine itself needs to
change to support that.

## Demo mode compatibility

Demo mode has no separate "conversation" row — a `(fanUsername,
creatorUsername)` pair *is* the conversation (a deterministic id like
`demo:alexm:mayaokoye`), and every existing `ChatSession` record for that
pair (already preserved across renewals since Stage 2 — this is not new
behavior) is a "session" in the new model's terms. See
`lib/repositories/demo/demo-conversation-engine.ts` for the adapter. Both
`ConversationRepository` and `ConversationSessionRepository` are fully
implemented for demo mode, and `getClientConversationRepository()` /
`getClientConversationSessionRepository()` (the only imports a Client
Component should use) pick demo vs. Supabase in exactly one place, same
pattern as every other dual-mode repository in this app.

## What's actually wired into the UI vs. what isn't (read this)

- **`app/chats/page.tsx` (the chat list)**: fully dual-mode. Real mode
  fetches `getUserConversations()`, resolves each conversation's active
  session via `ConversationSessionService`, and renders through the same
  `ChatListItem` component demo mode uses (refactored this sprint into a
  pure/presentational component that takes pre-computed `active`/
  `remainingMs` as props, rather than deriving them internally from
  demo-only lookups — a deliberate, low-risk internal refactor, not a
  visual redesign).
- **`app/chats/[username]/page.tsx` (an individual conversation)**: **not
  rewired this sprint.** It remains demo-mode-only. This page's message
  thread, composer, media-request cards, and safety menu are all deeply
  coupled to the demo message/purchase store (`lib/chat.ts`), which is
  explicitly out of scope to replace here ("do not implement realtime
  messaging yet" — there is no real message storage for a thread to read
  from in the first place). Attempting a partial rewrite of this
  particular 400+ line, safety-critical page under this sprint's scope
  risked introducing a real regression in the one flow every user
  actually depends on daily, for a page whose central feature (the
  message thread) can't be real yet regardless. The countdown/expiry/
  renew UI patterns this page already has are the reference
  implementation the real conversation engine should eventually drive —
  wiring them up is tracked below as the top of the remaining work list.

## Known remaining work

1. **`app/chats/[username]/page.tsx` real-mode wiring** — the highest-value
   next step: swap its session lookup to `ConversationSessionService`
   (countdown, expired state, renew button) while the message thread
   itself shows an honest "messaging isn't available for this creator
   yet" state until a real message system exists.
2. **No real message system** — `MessageRepository`/`MessagingService`
   remain Phase 2.1A placeholders; `canUserMessage()` is ready for the
   endpoint that will use them.
3. **No automated RLS test suite** for the new tables — this sprint's
   verification was manual, against a real local Postgres 16 instance
   (see the Security section above), same limitation already noted for
   profiles/creators.
4. **`Countdown`'s formatting logic and
   `ConversationSessionService.formatCountdown()` are two separate
   implementations** of the same "23h 12m" style — worth consolidating
   once the active chat page is rewired to actually use the service's
   version.
5. **No refund UI** — `refunded` status exists in the schema and is
   admin-writable via RLS, but there's no admin surface to trigger it yet.
6. **`archiveConversation()`** is implemented as a placeholder that throws
   — no "hide this conversation" UI exists yet to call it.
