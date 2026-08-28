import type { CommissionResolution } from "@/lib/finance-types";

const BPS_DENOMINATOR = 10000; // basis points: 10000 bps = 100%

export interface CreatorCommissionInput {
  /** Direct per-creator override, if set — highest priority (§4 priority 1). */
  commissionRateBps: number | null;
  /** The creator's assigned tier, if any (§4 priority 2). */
  tier: { name: string; commissionBps: number } | null;
}

/**
 * The single authoritative commission-rate resolver (§4). Pure — no I/O —
 * so the priority order itself (creator override → tier → global default)
 * is fully unit-testable without a database. Callers are responsible for
 * fetching `input` and `globalDefaultBps` (see
 * lib/repositories/supabase/finance-queries.ts for the real lookup); this
 * function only ever decides between values it's handed, never fetches
 * anything itself, and never accepts a rate from the client.
 */
export function resolveCommissionRate(input: CreatorCommissionInput, globalDefaultBps: number): CommissionResolution {
  if (input.commissionRateBps !== null && input.commissionRateBps !== undefined) {
    return { rateBps: input.commissionRateBps, source: "creator_override" };
  }
  if (input.tier) {
    return { rateBps: input.tier.commissionBps, source: "tier", tierName: input.tier.name };
  }
  return { rateBps: globalDefaultBps, source: "global_default" };
}

export interface CommissionCalculation {
  grossAmountMinor: number;
  platformFeeMinor: number;
  creatorNetMinor: number;
  commissionRateBps: number;
}

/**
 * Splits a gross payment (integer minor units) into platform fee and
 * creator net, at the given commission rate. Never floating-point money:
 * `grossAmountMinor` and `rateBps` are both integers, their product stays
 * far inside JS's safe-integer range (2^53) for any realistic payment
 * size, so `grossAmountMinor * rateBps` is an *exact* integer — the only
 * floating-point step is the final division-then-round to the nearest
 * whole minor unit, which is the standard, safe way to do integer
 * percentage splits. The fee is rounded (half up); the creator's net is
 * always gross minus that rounded fee, so the two invariantly sum back to
 * the original gross amount with no leftover fraction — matching the
 * database's own `creator_net_minor = gross_amount_minor - platform_fee_minor`
 * CHECK constraint exactly.
 */
export function calculateCommission(grossAmountMinor: number, rateBps: number): CommissionCalculation {
  if (!Number.isInteger(grossAmountMinor) || grossAmountMinor < 0) {
    throw new Error("grossAmountMinor must be a non-negative integer.");
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > BPS_DENOMINATOR) {
    throw new Error("rateBps must be an integer between 0 and 10000.");
  }

  const platformFeeMinor = Math.round((grossAmountMinor * rateBps) / BPS_DENOMINATOR);
  const creatorNetMinor = grossAmountMinor - platformFeeMinor;

  return { grossAmountMinor, platformFeeMinor, creatorNetMinor, commissionRateBps: rateBps };
}
