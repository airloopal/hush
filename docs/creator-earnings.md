# Creator Earnings & Payouts (Sprint L8)

## Important note on this delivery

This sprint required real reconciliation work with an Admin Portal built
in an earlier session that turned out to have partially succeeded despite
appearing not to. Two things are worth knowing:

1. **A real, subtle bug was found and fixed**: `admin_audit_log`'s type
   definition in `database.types.ts` was missing `Insert`/`Update`
   shapes. Supabase-js's generic `SupabaseClient<Database>` constraint
   requires every table to have all three — one incomplete table
   collapsed type inference to `never` for *every* table in the entire
   codebase. Fixed by giving every table a complete `Row`/`Insert`/
   `Update`/`Relationships` shape; worth remembering if this ever
   resurfaces after a future schema change.
2. **The Admin Portal's original `creator_withdrawals` table was
   deprecated and dropped** (migration `20260701000032`) in favor of
   this sprint's ledger-integrated `creator_payout_requests`. The
   original had no way to check a requested amount against an actual
   balance — it predated any ledger existing. Its RBAC functions
   (`is_staff`/`is_privileged_staff`) and audit log (`admin_audit_log`/
   `log_admin_action`) were reused, not duplicated.

## Business model configuration

Centrally configured in `platform_settings` (key/value table), never
scattered constants:
- `default_commission_bps` = 2000 (20%)
- `minimum_payout_minor` / `minimum_payout_currency` = 5000 / "USD" ($50)
- `settlement_hold_hours` = 48

## Commission resolution (§4)

`lib/payments/commission-service.ts` — `resolveCommissionRate()`, pure
and fully unit-tested. Priority: **creator-specific override**
(`creator_profiles.commission_rate_bps`) → **tier**
(`creator_profiles.commission_tier_id` → `creator_commission_tiers`,
e.g. "Founding Creator" at 10%) → **global default**
(`platform_settings.default_commission_bps`). Founding Creator support
requires zero global config changes — just assign the tier (or set a
direct override) on that one creator's profile.

`calculateCommission()` splits a gross integer-minor-unit amount into
fee/net at a given rate, rounding the fee to the nearest minor unit;
`creatorNet = gross - fee` always, by construction, so the two invariably
reconcile — matching the database's own CHECK constraint on
`creator_ledger_entries`.

**The actual rate used is always stored with the ledger entry**
(`commission_rate_bps`) — changing `platform_settings` or a tier later
never rewrites history.

## The ledger (§1)

`creator_ledger_entries` — immutable, append-only. A BEFORE UPDATE
trigger (`protect_ledger_immutability`) blocks any change to amounts,
currency, type, or source once a row exists; the only two fields that can
ever change are `settlement_status` (pending -> available, time-based)
and `payout_id` (null -> set, exactly once). A correction is always a new
row, never an edit — verified this sprint against real Postgres.

## Balances (§2)

`creator_balances` is a `security_invoker` view, not a stored table —
SUM(creator_net_minor) grouped by (creator_id, currency,
settlement_status), plus a paid_out_minor column joined against
creator_payout_requests.status = 'paid'. There is exactly one source of
truth (the ledger); nothing else stores a balance that could drift out of
sync.

## Earning lifecycle (§3)

```
Fan pays -> webhook verifies payment (Sprint L5, unchanged)
         -> ConversationSessionService.activate() (unchanged)
         -> recordChatEarning() (NEW, additive call in the same webhook handler)
              -> idempotent: unique index on (entry_type='chat_earning', source_payment_id)
              -> resolves commission, inserts one ledger entry (status: pending)
         -> settle_matured_ledger_entries() flips it to 'available' once
            settlement_hold_hours has elapsed (lazy, time-based sweep --
            same pattern as Sprint L3's session expiry)
         -> creator requests a payout -> admin reviews -> paid
```

`recordChatEarning()` is a genuine addition to the existing webhook
handler (`lib/payments/webhook-handler.ts`) but is purely additive — the
session-activation logic from Sprint L5 is untouched.

## Payout requests (§6) — concurrency (§12)

`request_payout(amount, currency, destination?)` is a SECURITY DEFINER
RPC, not a raw table insert. It:
1. Takes a per-creator Postgres advisory lock for the transaction — a
   second concurrent call for the same creator blocks until the first
   commits or rolls back. This is the actual concurrency guarantee, not
   UI disabling.
2. Checks the amount against the minimum and the creator's live
   available balance (read from creator_balances inside the same locked
   transaction).
3. Inserts the payout request and a matching negative payout_deduction
   ledger entry, atomically — this is what makes the funds unavailable to
   a second request immediately, not just once an admin acts.

Verified this sprint: below-minimum rejected, over-balance rejected,
cancelling a pending request creates a compensating positive entry that
correctly frees the funds (proved by immediately re-requesting the full
freed balance), a rejected request does the same.

## Commission worked example

£5.00 payment, 20% commission -> £1.00 platform fee, £4.00 creator net —
exactly the sprint brief's own example, verified as an automated test
(commission-service.test.ts).

## Admin integration (§8)

`app/admin/payouts/page.tsx` — the minimal, focused surface this
sprint's system needs, not a duplicate of a fuller portal (none exists to
duplicate). Uses the existing `app/admin/layout.tsx` boundary
(`requireStaff()`, 404s for non-staff) and the existing `canStaffRole()`
capability matrix (extended with `viewPayouts`/`decidePayouts`,
replacing the unused `viewWithdrawals`/`decideWithdrawals` keys the old
table would have used). Every action (approve/reject/mark processing/
mark paid) is a thin call to the server-side RPC — the button's
visibility is UI-only; the actual authorization is
`is_privileged_staff()` inside each RPC. Every action logs via the
existing `log_admin_action()` -> `admin_audit_log`, verified this sprint.

## Refunds/reversals (§9)

`reverse_ledger_earning(entryId, reason)` — privileged-staff only,
inserts a new `reversal` row with the opposite sign, linked via
`reverses_entry_id`. The original entry is never touched. Does not
invent any Rampex refund webhook behavior — this is a ledger-side
capability for representing "money should come back," triggerable by an
admin regardless of how that determination was made, since a real
provider-side refund event's exact shape wasn't something this project
had verified access to (see docs/rampex-payments.md).

## Multi-currency (§10)

Every balance/ledger query groups by (creator_id, currency).
creator_balances has one row per currency a creator has ever earned in.
Nothing sums across currencies.

## RLS/security review (§11)

Verified against real Postgres this sprint: creators see only their own
ledger/balance/payout rows; a creator cannot self-set their own
commission override (protected trigger, extending the existing
Phase-2.1B pattern); support role can view but cannot approve/reject/mark
paid (is_privileged_staff() check inside every mutating RPC); a creator
cannot approve their own payout even by calling the RPC directly.

## Testing (§13)

`lib/payments/__tests__/commission-service.test.ts` — 16 tests: the
sprint's own 80/20 example, a 90/10 Founding Creator arrangement,
rounding across many rates (always reconciles to the exact gross),
priority resolution (override > tier > default), edge cases (0%, 100%,
zero gross, invalid input). Plus real-Postgres verification this session
(not repeated as automated tests, consistent with every prior phase's
documented limitation): duplicate earning prevention, available vs.
pending balance split, payout minimum/insufficient-balance rejection,
concurrent-request protection via advisory lock, full payout lifecycle,
refund/reversal correctness, cross-creator isolation, multi-currency
separation.

## Known limitations / genuine blockers before production

1. **No real payment provider is connected** (unchanged from Sprint L5 —
   see docs/rampex-payments.md). Earnings only ever get recorded through
   a real webhook; nothing in this sprint changes that dependency.
2. **`settle_matured_ledger_entries()` has no scheduled job** — it's safe
   for any authenticated user to call (purely time-based, no user input),
   but nothing currently calls it automatically. A Supabase cron job or
   an edge function on a timer should call it periodically in
   production; until then, pending funds only become available when
   *something* happens to invoke it.
3. **No real payout-provider integration** — by design (§7). Payouts are
   marked "paid" manually by an admin after sending money outside the
   system.
4. **This has not been tested against a live Supabase project** — this
   sandbox has no network access to one. All verification is against a
   real local Postgres 16 instance with the actual migrations applied,
   which is rigorous for schema/RLS/trigger/function correctness, but is
   not the same as an end-to-end test against production infrastructure
   (real auth JWTs, real network latency, Supabase's actual RLS
   evaluation engine). Do not treat this as production-verified without
   that additional step.
