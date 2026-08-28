import { describe, expect, it } from "vitest";
import { resolveCommissionRate, calculateCommission } from "@/lib/payments/commission-service";

describe("resolveCommissionRate", () => {
  it("uses the global default when there's no override or tier", () => {
    const result = resolveCommissionRate({ commissionRateBps: null, tier: null }, 2000);
    expect(result).toEqual({ rateBps: 2000, source: "global_default" });
  });

  it("uses the tier rate when assigned and no direct override exists", () => {
    const result = resolveCommissionRate(
      { commissionRateBps: null, tier: { name: "Founding Creator", commissionBps: 1000 } },
      2000
    );
    expect(result).toEqual({ rateBps: 1000, source: "tier", tierName: "Founding Creator" });
  });

  it("prioritizes a direct per-creator override over a tier", () => {
    const result = resolveCommissionRate(
      { commissionRateBps: 500, tier: { name: "Founding Creator", commissionBps: 1000 } },
      2000
    );
    expect(result).toEqual({ rateBps: 500, source: "creator_override" });
  });

  it("prioritizes a direct override over the global default even with no tier", () => {
    const result = resolveCommissionRate({ commissionRateBps: 1500, tier: null }, 2000);
    expect(result).toEqual({ rateBps: 1500, source: "creator_override" });
  });

  it("treats an explicit 0 bps override as a real override (falsy but not null)", () => {
    const result = resolveCommissionRate({ commissionRateBps: 0, tier: null }, 2000);
    expect(result).toEqual({ rateBps: 0, source: "creator_override" });
  });
});

describe("calculateCommission", () => {
  it("computes the standard 80/20 split from the sprint's own example (£5.00, 20%)", () => {
    const result = calculateCommission(500, 2000);
    expect(result).toEqual({
      grossAmountMinor: 500,
      platformFeeMinor: 100,
      creatorNetMinor: 400,
      commissionRateBps: 2000,
    });
  });

  it("computes a Founding Creator 90/10 split", () => {
    const result = calculateCommission(500, 1000);
    expect(result.platformFeeMinor).toBe(50);
    expect(result.creatorNetMinor).toBe(450);
  });

  it("always reconciles: fee + net === gross, for many rates", () => {
    const gross = 1999;
    for (const rateBps of [0, 1, 500, 999, 1000, 2000, 3333, 5000, 9999, 10000]) {
      const { platformFeeMinor, creatorNetMinor } = calculateCommission(gross, rateBps);
      expect(platformFeeMinor + creatorNetMinor).toBe(gross);
    }
  });

  it("rounds the fee to the nearest whole minor unit rather than leaving a fraction", () => {
    const result = calculateCommission(333, 2000);
    expect(result.platformFeeMinor).toBe(67);
    expect(result.creatorNetMinor).toBe(266);
  });

  it("handles a 0% commission rate (entire gross is creator net)", () => {
    const result = calculateCommission(1000, 0);
    expect(result).toEqual({ grossAmountMinor: 1000, platformFeeMinor: 0, creatorNetMinor: 1000, commissionRateBps: 0 });
  });

  it("handles a 100% commission rate (entire gross is platform fee)", () => {
    const result = calculateCommission(1000, 10000);
    expect(result).toEqual({ grossAmountMinor: 1000, platformFeeMinor: 1000, creatorNetMinor: 0, commissionRateBps: 10000 });
  });

  it("handles a gross amount of 0", () => {
    const result = calculateCommission(0, 2000);
    expect(result).toEqual({ grossAmountMinor: 0, platformFeeMinor: 0, creatorNetMinor: 0, commissionRateBps: 2000 });
  });

  it("rejects a non-integer gross amount", () => {
    expect(() => calculateCommission(500.5, 2000)).toThrow();
  });

  it("rejects a negative gross amount", () => {
    expect(() => calculateCommission(-100, 2000)).toThrow();
  });

  it("rejects a rate outside 0-10000 bps", () => {
    expect(() => calculateCommission(500, -1)).toThrow();
    expect(() => calculateCommission(500, 10001)).toThrow();
  });

  it("rejects a non-integer rate", () => {
    expect(() => calculateCommission(500, 2000.5)).toThrow();
  });
});
