import { describe, expect, it } from "vitest";
import { formatPresenceLabel } from "@/lib/realtime/presence";

const NOW = new Date("2026-01-01T12:00:00.000Z").getTime();

describe("formatPresenceLabel", () => {
  it("is Offline for null (never seen)", () => {
    expect(formatPresenceLabel(null, NOW)).toBe("Offline");
  });

  it("is Active now within 2 minutes", () => {
    const oneMinuteAgo = new Date(NOW - 60_000).toISOString();
    expect(formatPresenceLabel(oneMinuteAgo, NOW)).toBe("Active now");
  });

  it("is Online for a timestamp in the future (clock skew safety)", () => {
    const future = new Date(NOW + 5000).toISOString();
    expect(formatPresenceLabel(future, NOW)).toBe("Online");
  });

  it("is Last seen recently between 2 minutes and 1 hour", () => {
    const thirtyMinutesAgo = new Date(NOW - 30 * 60 * 1000).toISOString();
    expect(formatPresenceLabel(thirtyMinutesAgo, NOW)).toBe("Last seen recently");
  });

  it("is a formatted time between 1 hour and 7 days", () => {
    const twoDaysAgo = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString();
    const label = formatPresenceLabel(twoDaysAgo, NOW);
    expect(label.startsWith("Last seen ")).toBe(true);
    expect(label).not.toBe("Last seen recently");
  });

  it("is Offline beyond 7 days", () => {
    const twoWeeksAgo = new Date(NOW - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatPresenceLabel(twoWeeksAgo, NOW)).toBe("Offline");
  });
});
