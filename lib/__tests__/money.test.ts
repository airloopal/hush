import { describe, expect, it } from "vitest";
import { formatMinorUnits } from "@/lib/money";

describe("formatMinorUnits", () => {
  it("formats USD cents correctly", () => {
    expect(formatMinorUnits(450, "USD")).toBe("$4.50");
  });

  it("formats a whole-dollar amount without dangling zeros in unexpected places", () => {
    expect(formatMinorUnits(500, "USD")).toBe("$5.00");
  });

  it("formats zero", () => {
    expect(formatMinorUnits(0, "USD")).toBe("$0.00");
  });

  it("formats a negative amount (e.g. a reversal)", () => {
    expect(formatMinorUnits(-400, "USD")).toBe("-$4.00");
  });

  it("falls back gracefully for an unrecognized currency code rather than throwing", () => {
    expect(() => formatMinorUnits(500, "XYZ")).not.toThrow();
  });
});
