# Realtime Messaging (Launch Sprint L4)

## What this sprint built

A production messaging backend on top of the conversation/session engine
from Launch Sprint L3: persistent messages, Supabase Realtime delivery,
typing indicators, read receipts, unread counts, system-derived presence,
pagination, and server-authoritative rate limiting. Explicitly **not**
built here: Rampex, media uploads, push notifications, an admin dashboard,
or any change to the conversation/session engine itself.

**Honest scope note**: the backend (schema, repositories, services,
realtime/typing/presence infrastructure) is complete and verified. Wiring
it into `app/chats/[username]/page.tsx` — the actual message thread UI —
is **not done this sprint**; see "Known future work." This mirrors the
same scoping decision made in Launch Sprint L3 for the same page, for the
same reason: it's the app's most complex, safety-critical page, and a
rushed partial rewrite risked a real regression for less value than
getting the backend fully right and tested.

## Message lifecycle

```
Compose -> validateMessageBody() -> MessagingService.send()
              |
              +- pre-check: ConversationSessionService.isActive() (fast, local)
              |
              v
      MessageRepository.sendMessage(conversationId, body, clientMessageId)
              |
              v
      INSERT messages (protect_message_send trigger re-verifies
      participant / active account / approved creator / active session /
      rate limit -- the actual authorization boundary, not the pre-check
      above)
              |
              v
      sync_conversation_latest_message trigger updates
      conversations.latest_message_at/preview automatically
              |
              v
      Realtime broadcasts the INSERT to every subscriber of
      messages:<conversationId> (including the sender's own other tabs)
```

## Optimistic sending

A message should appear the instant Send is pressed, in one of three
states: `sending` -> `sent` (reconciled with the confirmed row) or
`failed` (original text preserved, retry available). `OptimisticMessage`
(`lib/message-types.ts`) is `MessageSummary & { deliveryState }` for
exactly this — a UI holds a local list of these, appends one with
`deliveryState: "sending"` immediately on submit, and updates it in place
once `MessagingService.send()` resolves (or reject -> `"failed"`, body
preserved for retry).

## Idempotent retries

Every send carries a client-generated `client_message_id`. The unique
index `messages_sender_client_id_unique_idx (sender_id, client_message_id)`
guarantees the same optimistic message can never persist twice — and
`querySendMessage` checks for an existing row with that
`(sender_id, client_message_id)` pair *before* inserting, so retrying a
send that actually already succeeded (e.g. the network dropped after the
INSERT committed but before the response arrived) returns the original
message rather than erroring or duplicating.

## Realtime subscription model

One Postgres Changes channel per conversation, named `messages:<conversationId>`
(`lib/realtime/message-channel.ts`) — never a global "all messages"
channel. A module-level map tracks the channel + its listener set per
conversation, so:

- Multiple call sites subscribing to the *same* conversation share one
  underlying socket subscription rather than opening duplicates.
- The channel is only actually torn down (`removeChannel`) once every
  listener has unsubscribed — switching away from a conversation and back
  quickly doesn't churn the connection.
- Each conversation's channel is entirely independent, so leaving one chat
  can never leak messages into another.

**Reconciliation**: an incoming realtime INSERT for a message the current
user just sent optimistically should replace the optimistic entry (match
on `client_message_id`) rather than appending a duplicate — this is a UI
concern for whichever component renders the thread (not yet built this
sprint, see Known future work), using the same `client_message_id` the
optimistic entry was created with.

**Reconnect handling**: `subscribeToRealtimeConnectionState` polls the
browser client's `realtime.isConnected()` every 2s to drive a compact
"Reconnecting…" indicator without blocking the page. On reconnect, the UI
should re-fetch messages newer than the last one it has (via
`getMessages` with a cursor) to catch anything missed while offline —
Postgres Changes doesn't replay missed events on reconnect by itself.

## Typing indicators

`lib/realtime/typing-channel.ts` — ephemeral Realtime **broadcast** only
(`{ config: { broadcast: { self: false } } }`), never written to the
database. One `TypingChannel` instance per open conversation:

- `notifyTyping()` — call on every composer keystroke. Internally
  throttled to at most one broadcast per 2s, and resets a 2s inactivity
  timer that automatically sends a "stopped typing" broadcast if the user
  pauses — so calling it on every keystroke is cheap and never spams
  events.
- `notifyStopped()` — call explicitly on submit, on clearing the input, or
  on blur, for an immediate rather than timeout-delayed clear.
- `self: false` means the sender never receives their own broadcasts —
  the current user's own typing state is never shown to them, by
  construction, not by a filter that could be forgotten.
- `dispose()` — call on navigating away or disconnecting; sends a final
  "stopped" and removes the channel.

Typing is only ever visible to conversation participants because the
channel name is scoped per-conversation and nothing else knows to
subscribe to it — there's no channel-level access control needed beyond
that, since broadcast channels aren't backed by a table RLS could protect
anyway.

## Read receipts

`conversation_reads` — one row per `(conversation, participant)`, holding
only the *latest* read message/timestamp, never a per-message flag table.
`mark_conversation_read(conversation_id, message_id?)` (RPC) upserts it.
The intended call pattern: mark read once when a conversation becomes
visible/focused and once more when the newest visible message changes
while still focused — not on every message individually, and debounced
rather than fired on every scroll event.

Visual state for the current user's own outbound messages: **Sent**
(persisted, no read receipt yet) vs. **Read** (the other participant's
`conversation_reads.last_read_at` is newer than this message's
`created_at`) — a UI computes this by comparing its own sent messages
against `getLastReadState()` for the other participant, not by writing
anything.

## Unread calculation

Never counted from local UI state — always derived from persisted
`conversation_reads` compared against `messages.created_at`, excluding
the current user's own messages (`queryGetUnreadCounts` in
`lib/repositories/supabase/message-queries.ts`). One query per
conversation the user is in (not one per message), since Postgres doesn't
have a cheap "count with a different filter per group" primitive without
a more complex aggregate query — documented as a future optimization
target if the conversation-per-user count grows large (see Known future
work). The chat list's unread badge (§9/§13) is wired to this today.

## Presence model

`user_presence` has exactly one write path: `touch_presence()`, a
`SECURITY DEFINER` RPC that self-throttles to roughly one write per 20
seconds per user regardless of call frequency — a client can call
`touchPresence()` (`lib/realtime/presence.ts`) as often as convenient
(pointer/keydown/focus/visibility events all wired via
`startPresenceHeartbeat()`) without generating excessive writes, because
the throttle lives in the database function itself, not just the client.

Five states (`formatPresenceLabel`), all derived from a timestamp, never a
stored boolean: **Online/Active now** (< 2 min), **Last seen recently**
(< 1 hour), a formatted **"Last seen [day] at [time]"** (< 7 days), or
**Offline**. Visibility is RLS-restricted to the user themselves and
whoever shares a conversation with them — never a public presence list —
and, critically, **presence is informative only**: nothing in this schema
grants access to anything based on a `user_presence` row (§10 — "must not
bypass availability or session rules"). Availability/session state
(whether a fan can actually message a creator) is entirely determined by
`conversation_sessions` and the `creator_profiles`/`profiles` status
checks already built in Launch Sprint L3, completely independent of this
table.

## Session enforcement (recap from L3, still the authority here)

Every message send is gated by the *same* active-session concept L3
built — `ConversationSessionService.isActive()` client-side as a fast
pre-check, `protect_message_send`'s live `conversation_sessions` lookup
as the actual database-enforced boundary. Nothing about messaging
introduces a second notion of "is this conversation currently usable."

## Rate limiting

**Chosen limit: 20 messages per sender, per conversation, per rolling
60-second window**, enforced inside `protect_message_send` (a `count(*)`
over `messages` in the trigger, not a separate table). Rationale: generous
enough for genuine rapid back-and-forth conversation (a burst of quick
replies), restrictive enough to stop a scripted spam loop. Returns a
plain, friendly Postgres exception message ("You are sending messages too
quickly...") that `classifyMessagingError` maps to `"rate-limited"` rather
than exposing the raw trigger error. This is **not** relying on a
disabled Send button alone — the check happens at insert time regardless
of what the client's UI state claims.

## Demo mode

`demoMessageRepository` (`lib/repositories/demo/demo-message-repository.ts`)
adapts the existing `lib/chat.ts` message store rather than building a
second one. "Realtime" within demo mode is a same-tab `EventTarget`: a
send dispatches an event any subscribed listener receives synchronously —
genuinely how demo mode already behaved before this sprint (a single
React state update visible everywhere in that tab), now expressed through
the same `MessageRepository` interface real mode uses. Unread counts and
read-state simulate against the existing `lib/conversation-reads.ts`
store. Demo and Supabase sessions remain isolated exactly as established
in Phase 2.2A (`lib/auth/mode.ts` is still the single decision point).

## Security review

- **RLS**: participants only, for `messages` (select/insert-as-self) and
  `conversation_reads` (select/insert/update own row only);
  `user_presence` select restricted to self-or-conversation-partner.
- **No client-facing UPDATE/DELETE on `messages` at all** — no edit/delete
  UI exists this sprint, matching the spec.
- **No client-facing INSERT/UPDATE on `user_presence`** — only
  `touch_presence()`.
- Verified against a real Postgres 16 instance this sprint: an unrelated
  user cannot read a conversation's messages (confirmed via RLS on
  `conversations` hiding it *before* `messages` RLS is even reached —
  two independent layers); sending as another user is rejected even with
  a hardcoded, known `conversation_id` (the trigger's own participant
  check, `SECURITY INVOKER`, is itself subject to the same RLS); duplicate
  `client_message_id` is rejected at the database level; whitespace-only
  messages are rejected; an unrelated user cannot write another user's
  `conversation_reads` row; direct client `UPDATE` on `user_presence` is
  denied outright; presence is only visible to the user themselves and
  their conversation partners, not to an unrelated third party.

## Performance

- Unread counts: one query per conversation the user is in, not per
  message (see "Unread calculation").
- Realtime: one channel per conversation, deduplicated across multiple
  subscribers, not one per message or a global firehose.
- Typing: throttled to ~1 broadcast per 2s regardless of keystroke rate.
- Presence: throttled to ~1 write per 20s regardless of call frequency,
  both client-side (25s) and server-side (20s, the actual guarantee).
- Pagination: `getMessages` always paginates (`DEFAULT_PAGE_SIZE = 30`),
  never fetches full history in one request.

## Known future work

1. **`app/chats/[username]/page.tsx` UI wiring** — the top remaining item,
   carried over from L3's own "known remaining work": message thread with
   pagination/scroll-position retention, optimistic send + retry UI,
   typing indicator display, read-receipt (Sent/Read) display, presence
   label in the header, reconnecting indicator, and composer disable
   logic across all the states §11 lists. Every backend piece this needs
   (`MessageRepository`, `MessagingService`, `TypingChannel`,
   `subscribeToConversationMessages`, `startPresenceHeartbeat`,
   `formatPresenceLabel`) is built, tested, and ready to consume.
2. **Unread count query cost** grows linearly with a user's conversation
   count (one query each) — fine at today's scale, worth revisiting (e.g.
   a materialized count or a single aggregate query) if a user
   accumulates hundreds of conversations.
3. **No automated RLS test suite** — verification this sprint was manual,
   against a real local Postgres 16 instance, same limitation noted in
   every prior phase's docs.
4. **Message editing/deletion** — `edited_at`/`deleted_at` columns exist
   per spec but have no trigger, RLS policy, or UI; a future sprint would
   need to add an UPDATE policy scoped to the sender and a time window.
5. **No push notifications** — explicitly out of scope this sprint;
   realtime delivery only works while the tab is open and subscribed.
