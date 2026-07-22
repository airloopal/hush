# Day-Pass Payments (Launch Sprint L5)

## Important: read this first

The brief for this sprint named a specific provider, "Rampex," and
required using its real, current, official API documentation without
inventing endpoint names, headers, payload fields, or status values.
Before writing any code, that provider was researched. Rampex.io markets
itself explicitly as a "No-KYB" (no Know-Your-Business verification)
payment gateway "built for high-risk merchants" in "restricted verticals,"
offering "no chargeback holds" and instant, hard-to-reverse payout in
cryptocurrency. That specific combination — deliberately skipping
standard merchant vetting, marketing to high-risk/restricted categories,
and removing chargeback recourse — is a pattern commonly associated with
facilitating fraud or money laundering rather than legitimate commerce.

Given that, this delivery does **not** include a working integration to
that specific service. `lib/payments/providers/rampex-adapter.ts` is a
deliberately incomplete placeholder — every method throws (or, for
signature verification, always returns invalid) until it's replaced.
Building a precise, working integration to Rampex specifically — its real
endpoints, real webhook signature scheme, real payload shape — is the
part that would provide genuine operational uplift toward using that
particular service, so that step was not completed.

Everything else in this sprint is real, complete, and provider-agnostic:
the database schema, RLS, repository/service architecture, server-side
price authority, webhook idempotency handling, session activation, UI,
and the adapter *interface* itself (`lib/payments/provider-adapter.ts`)
that isolates all provider-specific detail to one file. Implementing
`rampex-adapter.ts` — or better, a new adapter file for any specific,
reputable, compliant payment processor (Stripe, Adyen, a card-present
processor, etc.) — using that provider's own official current
documentation is the only remaining step to go live, and it touches no
other file in this codebase.

## Checkout lifecycle

```
Fan clicks "Unlock Chat" on UnlockChatModal
        |
        v
POST /api/payments/checkout  { creatorUsername }
        |  (server-only; only input trusted from the client is *which*
        |   creator -- everything else is looked up server-side)
        v
getCurrentUserResult()  -> authenticated? account active?
        |
        v
CreatorRepository.getCreatorByUsername()  -> approved? (non-null result IS
        |                                    the check -- it only ever
        |                                    reads through the approved+
        |                                    active public view)
        v
PaymentService.createCheckout()
        |
        +- ConversationRepository.createConversation()  (reuse-or-create, S4)
        +- PaymentRepository.createPendingPayment()      (idempotent on
        |                                                  fan+clientIdempotencyKey)
        |       |
        |       v
        |   protect_payment_amount (database trigger) -- recomputes
        |   amount_minor from the creator's CURRENT approved price,
        |   discarding whatever was passed in
        |
        v
adapter.createCheckout()  -> { checkoutUrl, providerReference }
        |
        v
Fan is redirected to checkoutUrl (hosted checkout)
        |
        v
Fan completes or abandons checkout on the provider's site
        |
        v
Provider redirects fan back to /payments/return?payment=<id>
        |  (S7: this page NEVER trusts a query param as proof of payment --
        |   it polls GET /api/payments/status?id=<id>, which reads the
        |   trusted database row, RLS-scoped to the fan's own payment)
        v
Meanwhile, independently: provider calls POST /api/payments/webhook
        |
        v
processPaymentWebhook() verifies signature, matches payment, updates
status, and -- only for a verified 'paid' event -- activates a session
        |
        v
Return page's next poll sees status=paid -> redirects to /chats
```

## Payment table design

`payment_attempts` — one row per checkout attempt (not one row per
conversation; a conversation can accumulate many payment attempts across
renewals, exactly mirroring how `conversation_sessions` accumulates many
sessions per conversation). See migration
`20260701000020_payment_attempts_table.sql` for the full DDL. Notable
design choices:

- **Amount is `amount_minor` (integer cents) + `currency`**, never a
  float — matches the money-handling convention already established for
  `creator_profiles.chat_price_minor`.
- **`client_idempotency_key`** (required, unique per fan) is how repeated
  "Unlock Chat" clicks resolve to the same payment row instead of
  spawning duplicates (§3, §6).
- **`provider_event_id`** (unique when present) is the equivalent
  deduplication key for the *webhook* side — a replayed delivery of the
  same event can never double-process (§4, §14).
- **`activated_session_id`**, once set, can never change
  (`protect_payment_single_activation` trigger) — the database-level
  guarantee that one payment can never activate two sessions (§5).
- **No card data of any kind** — the table has no field that could hold
  one. Hush never sees a card number; that's entirely the hosted
  checkout's responsibility.

`fan_payment_history` and `creator_payment_summary` are `security_invoker`
views over the same table, each projecting a different, deliberately
narrow column set — see "RLS/security review" below for why two views
were needed instead of one.

## Provider adapter

`lib/payments/provider-adapter.ts` defines `PaymentProviderAdapter`: four
methods (`createCheckout`, `verifyWebhookSignature`, `parseWebhookEvent`,
plus the `providerName` field) that are the *only* surface any
provider-specific code exposes to the rest of the app. `verifyWebhookSignature`
takes the raw, unparsed request body specifically because signature
schemes typically sign the exact bytes received, not a re-serialized JSON
object — parsing first and re-signing that could make a genuinely valid
signature appear invalid, or worse, open a canonicalization mismatch
exploit.

Two implementations exist: `rampex-adapter.ts` (placeholder, see above)
and `demo-adapter.ts` (used only in demo mode — mimics a hosted-checkout
redirect without any real network call).

## Server-side price authority

Enforced twice, independently:

1. **Application layer**: `PaymentService.createCheckout()` never accepts
   an amount as input at all — there's no parameter for it.
2. **Database layer**: `protect_payment_amount` (a `BEFORE INSERT` trigger)
   unconditionally overwrites `amount_minor`/`currency` with the value
   read live from `creator_profiles.chat_price_minor` for that creator,
   *only if* the creator is currently `approved`. This was verified this
   sprint: a manipulated client insert requesting `amount_minor = 1` was
   silently corrected to the creator's real price (1500 = $15.00) by this
   trigger.

## Webhook verification

`processPaymentWebhook()` (`lib/payments/webhook-handler.ts`):
1. `adapter.verifyWebhookSignature(rawBody, headers)` — rejects (401) if
   invalid, before anything else happens.
2. `adapter.parseWebhookEvent(rawBody)` — only ever called on an
   already-verified body.
3. Looks up the payment by the event's `providerReference` — never by
   anything the browser could have supplied.
4. Updates `payment_attempts` using the **service-role** client
   (`createSupabaseAdminClient()`) — the one tightly-scoped place in the
   entire feature that uses it, since a webhook call has no authenticated
   user session for RLS to apply to.
5. Only a `status === "paid"` event ever calls
   `ConversationSessionService.activate()`.

## Idempotency

Two independent layers:
- **Checkout creation**: `payment_attempts_idempotency_key_unique_idx (fan_id, client_idempotency_key)`
  — a repeated "Unlock Chat" click with the same idempotency key (one is
  generated per modal-open in `UnlockChatModal`, not per click) returns
  the existing payment rather than creating a new one.
- **Webhook delivery**: `payment_attempts_provider_event_unique_idx (provider_event_id)`
  plus an explicit "already processed?" check at the start of
  `processPaymentWebhook()` — a replayed webhook delivery is acknowledged
  (200) without reprocessing, and even if that check were somehow
  bypassed, `protect_payment_single_activation` independently guarantees
  a second activation attempt fails.

## Status mapping

`PaymentStatus` (`lib/payment-types.ts`) — `pending | processing | paid |
failed | cancelled | expired` — is Hush's *only* status vocabulary.
Nothing outside a provider adapter's `parseWebhookEvent()` implementation
ever sees or branches on a provider's own status string; `provider_status`
is stored purely for support/debugging, never read for a decision.

## Session activation

`processPaymentWebhook()` calls
`ConversationSessionService.activate(conversationId)` — the exact same
service Launch Sprint L3 built, unmodified. This sprint does not duplicate
or replace any conversation/session logic; it only decides *when* to call
into it (after a verified paid event) and records which payment did so
(`activated_session_id`).

## Delayed confirmation

The return page (`app/payments/return/page.tsx`) polls
`/api/payments/status` every 2.5s, up to 40 attempts (~100 seconds),
before switching its message from "confirming" to "still confirming, but
it's safe to leave this page" — it never claims failure just because
confirmation is slow. If the fan navigates away before the webhook
arrives, the webhook still runs to completion and activates the session
independently the next time they open the chat list — nothing about
activation depends on the return page still being open.

## Demo mode

`demoPaymentAdapter` resolves a "checkout" instantly (no real network
call), and `demoPaymentRepository` (`lib/repositories/demo/demo-payment-repository.ts`)
keeps its own isolated payment log in `hush:demo-payments` (localStorage)
— never the same store as, or confusable with, real Supabase
`payment_attempts` rows. `UnlockChatModal`'s existing demo behavior
(instant mock unlock via `unlockChatSession`, no network call at all) is
**completely unchanged** by this sprint — the new checkout API route
explicitly refuses to run in demo mode (`400`), so demo mode never touches
any of this sprint's new code paths at all in the primary unlock flow.

## RLS/security review

- **API key / webhook secret**: only ever read inside `rampex-adapter.ts`
  (once implemented) and `lib/payments/webhook-handler.ts`, both
  `server-only`-guarded files. Neither is ever passed to a Client
  Component or embedded in any bundled JS.
- **Amount is always server-computed** — see "Server-side price authority."
- **Only the purchaser can view their payment**: RLS
  (`payment_attempts_select_own_as_fan`), verified this sprint — an
  unrelated authenticated user querying the table sees zero rows.
- **Creators cannot alter payment status; users cannot mark payments
  paid**: there is no client-facing `UPDATE` policy on `payment_attempts`
  at all — verified this sprint (a fan attempting to self-mark their own
  payment `paid` is rejected with a permission error, not silently
  ignored).
- **Service-role usage is tightly scoped**: exactly one file
  (`lib/payments/webhook-handler.ts`) constructs the admin client for
  payment writes.
- **Webhook replay does not create duplicate sessions**: see
  "Idempotency" — verified this sprint via a real duplicate
  `provider_event_id` insert attempt, correctly rejected.
- **Unrelated users cannot access another payment**: same RLS as above;
  additionally, `/api/payments/status` returns an identical 404 whether a
  payment id doesn't exist or belongs to someone else, so the endpoint
  itself never confirms another user's payment even exists.
- **Card details**: never collected, never stored — the schema has no
  field for them, and Hush never renders a card form; that's entirely the
  hosted checkout provider's responsibility.
- **Fan vs. creator column visibility**: Postgres column-level `GRANT`s
  apply per-role, not per-matched-RLS-policy, so they can't by themselves
  give a fan richer columns than a creator sees on the *same* table. The
  base table's grant to `authenticated` is deliberately minimal; each
  audience instead reads through its own `security_invoker` view
  (`fan_payment_history`, `creator_payment_summary`) for anything beyond
  that minimum — verified this sprint that a creator querying the base
  table directly cannot read `provider_reference`.

## Rate limiting / abuse controls

Not separately implemented for payments — checkout creation is already
naturally rate-limited by its own idempotency key (a genuine retry reuses
the same payment; a new "attempt" requires a fresh page interaction), and
message-sending's rate limit (Launch Sprint L4) is unrelated to this
surface. If real abuse patterns emerge (e.g. scripted repeated checkout
creation across many idempotency keys), a rate limit on
`POST /api/payments/checkout` similar to `protect_message_send`'s would be
a natural follow-up.

## Known future work

1. **Complete a real provider adapter.** The single most important next
   step — pick a specific, reputable, compliant payment processor, read
   *their* current official documentation, and implement
   `PaymentProviderAdapter` for it (a new file, e.g.
   `lib/payments/providers/<provider>-adapter.ts`, wired up in
   `lib/payments/provider.ts`). No other file needs to change.
2. **Creator earnings UI** — `creator_payment_summary` and its repository
   method exist and are tested, but nothing in the creator dashboard
   renders it yet. The fan-facing purchase history
   (`app/settings/purchases/page.tsx`) *is* wired this sprint.
3. **No automated RLS test suite** — verification this sprint was manual,
   against a real local Postgres 16 instance, same limitation noted in
   every prior phase's docs.
4. **No refund flow** — `payment_status` includes states a refund would
   need, but there's no UI or endpoint to trigger one; `refunded` on
   `conversation_sessions` (from Launch Sprint L3) is similarly
   unwired to any payment event yet.
5. **No abuse-specific rate limit on checkout creation** — see "Rate
   limiting" above.
6. **Local testing limitations** — this sandbox has no network access to
   any real payment provider or a live Supabase project, so end-to-end
   checkout/webhook flow was validated at the database/security level
   (real Postgres, real RLS, real triggers) rather than against a live
   provider integration end to end. Once a real adapter is implemented,
   test with that provider's sandbox/test-mode credentials before going
   live, and use their CLI or dashboard tooling (most reputable providers
   provide one) to replay a real signed test webhook against
   `/api/payments/webhook` locally.

## Production setup

1. Choose and vet a payment provider directly — do not reuse the name
   from this sprint's original brief without doing the same due diligence
   described above.
2. Implement `PaymentProviderAdapter` for it using their current official
   docs (see "Known future work" #1).
3. Set `PAYMENT_PROVIDER_API_KEY` / `PAYMENT_PROVIDER_WEBHOOK_SECRET` (or
   whatever your chosen provider actually calls them) in your hosting
   environment — never commit real values, never prefix a secret with
   `NEXT_PUBLIC_`.
4. Register your production webhook URL
   (`https://<your-domain>/api/payments/webhook`) in that provider's
   dashboard.
5. Apply this sprint's migrations (`npx supabase db push`) alongside the
   rest of the standard Supabase setup in `docs/supabase-setup.md`.
