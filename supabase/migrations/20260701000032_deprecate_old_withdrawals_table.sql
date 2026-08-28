-- Reconciliation with the Admin & Operations Portal's earlier work
-- (20260701000026_admin_withdrawals_reports_blocks.sql).
--
-- That migration's public.creator_withdrawals table was built before any
-- ledger/balance system existed, so its INSERT policy could only check
-- `creator_id = auth.uid() and status = 'pending'` — it had no way to
-- verify the requested amount against an actual balance, no minimum
-- enforcement, and no concurrency protection, because there was nothing
-- to check it against yet. It was never wired to any UI.
--
-- creator_payout_requests (20260701000030) plus request_payout()
-- (20260701000031) is the safe replacement this sprint's brief requires
-- (§6: "Prevent payouts above available balance... concurrent requests
-- spending the same balance... client manipulation of payout
-- amount/balance") — none of which the original table could provide.
-- Rather than maintain two competing payout systems (§2: "do not
-- maintain balances in multiple competing sources of truth"), the
-- original table is dropped here. Nothing references it from application
-- code (it was schema-only), so this is safe.
drop table if exists public.creator_withdrawals;
drop type if exists public.withdrawal_status;

comment on table public.creator_payout_requests is
  'Manual payout requests (§6). The requested amount is locked at request time via a matching payout_deduction ledger entry created atomically in the same transaction (see request_payout()) — this is what prevents double-spending the same available balance across concurrent requests, not application-level locking. Supersedes the earlier, unsafe public.creator_withdrawals (see 20260701000032).';
