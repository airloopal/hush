# Paid Live Photo & Video Requests (Sprint L9)

## What was reused vs. built new

**Reused, not duplicated**: `payment_attempts` (extended, not replaced —
`product_type` now also accepts `live_photo`/`live_video`), the exact same
`PaymentProviderAdapter` and checkout/webhook Route Handlers (branched by
product type, not forked into a parallel system), Sprint L8's
`recordChatEarning()` (called unmodified for media earnings — commission
math doesn't differ by product), `creator_profiles.photo_price_minor`/
`video_price_minor` (already existed since Phase 2.1B, already defaulted
to exactly $10/$20), the conversation/session active-check messaging
already relies on, and the existing `/admin` layout (RBAC + audit log).

**Genuinely new**: the `media_requests` table and its lifecycle functions,
and — since none existed anywhere in the app before this sprint — a
private Supabase Storage bucket with RLS.

## Flow

```
Fan, inside an active conversation, requests Live Photo/Video
        |
        v
POST /api/payments/checkout { conversationId, mediaRequestType }
        |
        v
create_media_request()  (database function)
        |  verifies: caller is the fan, conversation is theirs,
        |  session is currently active, creator is approved
        |  computes price from creator_profiles.photo_price_minor/
        |  video_price_minor directly (see "a real bug" below for why
        |  not via the existing trigger)
        v
payment_attempts row (pending) + media_requests row (pending_payment)
        |
        v
Same adapter.createCheckout() as chat day passes -> hosted checkout
        |
        v
Provider webhook -> processPaymentWebhook() -> verified 'paid' event
        |
        v
media_requests: pending_payment -> pending_creator
recordChatEarning() called (same function, same idempotency guarantee)
        |
        v
Creator: Accept -> accepted (24h to fulfil) -> upload -> fulfilled
      or: Decline -> refund_required (ledger reversal, see below)
      or: (no fulfilment in time) -> expire_stale_media_requests() -> refund_required
```

"Only verified server-side payment confirmation may activate a request"
— `media_requests` has **no client-facing INSERT/UPDATE grant at all**.
Every transition happens through a `SECURITY DEFINER` function that
enforces its own ownership/state checks, and the `pending_payment →
pending_creator` transition specifically only ever happens inside
`processPaymentWebhook()`, driven by the verified webhook event — never
by a browser redirect (the return page, unchanged from Sprint L5, still
only ever polls trusted server state).

## A real bug found and fixed this sprint

`refund_media_request()` initially checked `v_earning IS NOT NULL` to
mean "the earning row was found." In PL/pgSQL, `IS NOT NULL` on a
record/row value is only true when **every** column is non-null — since
legitimate columns on that row (`reference`, `source_conversation_id`,
etc.) were null, the check silently evaluated false even when
`SELECT INTO` had genuinely found the row, so declines were updating the
request's status correctly but **silently skipping the ledger reversal**.
Caught by adding explicit tracing and comparing against a known-good
direct query; fixed by checking `v_earning.id IS NOT NULL` instead.
Worth remembering for any future function following this pattern.

Also worth noting: `create_media_request()` computes the price directly
from `creator_profiles`, rather than relying on the existing
`protect_payment_amount` trigger (Sprint L5) the way ordinary client
inserts do. That trigger's "trusted internal caller" exemption checks
`current_user IN ('postgres', 'service_role')` — but a `SECURITY DEFINER`
function executes with `current_user` set to the function's *owner*
(`postgres`, for migrations run the normal way), which trips that same
exemption and would otherwise skip price-setting entirely for this
specific insert path. Computing the price directly inside the function
keeps the same server-side price authority guarantee.

## Media storage

A private bucket (`media-requests`, `public: false`) — nothing in the app
ever constructs a permanent public URL. Path convention:
`{media_request_id}/{filename}`. RLS on `storage.objects` authorizes by
joining back to `media_requests` (buyer, creator, or staff only for read;
creator-with-status-`accepted` only for write) — never by trusting the
path itself. The only way media is ever retrieved is a short-lived
(5-minute) signed URL from `GET /api/media-requests/[id]/signed-url`,
generated only after that route's own authorization check passes.
Type/size validation (`lib/media-requests/upload-validation.ts`, pure and
unit-tested) happens server-side in the fulfilment Route Handler before
anything is written — 25MB/JPEG-PNG-WEBP-HEIC for photos, 200MB/MP4-MOV-WEBM
for videos.

## Refunds/reversals

No Rampex (or any) refund API is called — that would be inventing
undocumented provider behavior, which this sprint (like L5 and L8 before
it) deliberately avoids. A decline or expiry creates a compensating
`reversal` ledger entry (same mechanism as L8) and sets the request to
`refund_required`, which is a visible signal for manual, provider-side
follow-up — the same "manual payout"-shaped boundary L8 already
established for money leaving the platform.

## Security review

Verified against a real Postgres 16 instance this sprint (with a minimal
`storage` schema shim, since no Storage extension exists in this
sandbox): a fan cannot accept/decline/fulfil their own request; an
unrelated creator gets an indistinguishable "not found" rather than a
permission error that would confirm the request exists; an unrelated fan
sees zero media requests via RLS; the storage bucket correctly grants the
buyer access and denies an unrelated user; a decline correctly creates a
reversal without ever mutating the original earning; the lazy expiry
sweep correctly flags a stale accepted request. `payment_attempts`' own
existing price-authority trigger and idempotency indexes are unchanged
and still apply to `chat_day_pass`.

## What's honestly not done

**In-chat UI was not wired.** `app/chats/[username]/page.tsx` has never
had its real-mode messaging wired — that was an explicit, documented
decision in Sprints L3/L4 (it's the app's largest, most safety-critical
page, and a rushed partial rewrite risked a real regression for less
value than getting the backend right). Extending that same page for
media-request states (awaiting payment / pending creator / accepted /
fulfilled / declined / expired, shown inline in the thread) would compound
that same risk, so it wasn't attempted here either. What *was* built
instead: a fully working, tested creator queue
(`components/real-media-request-queue.tsx`, wired into the dashboard
dual-mode alongside the existing demo queue) and an admin inspection page
(`/admin/media-requests`) — both genuinely functional, just not
integrated into the chat thread itself.

**No fan-facing "request Live Photo/Video" button** exists in the real
UI yet for the same reason — the natural place for it is the active chat
page's composer area, which isn't wired for real mode. `lib/media-requests/client.ts`'s
`requestMedia()` is ready for that integration whenever the chat page
itself is tackled.

**`expire_stale_media_requests()` has no scheduled job**, same limitation
as `settle_matured_ledger_entries()` from Sprint L8 — safe for any
authenticated user to call, but nothing currently calls it automatically.

**Not tested against a live Supabase project or live Storage** — this
sandbox has no network access to either. Verification is against a real
local Postgres 16 instance with a hand-built storage schema shim, which
is rigorous for schema/RLS/trigger/function correctness but is not the
same as testing against Supabase's actual Storage service.
