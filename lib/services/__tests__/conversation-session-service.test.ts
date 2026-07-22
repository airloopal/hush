import { describe, expect, it } from "vitest";
import { ConversationSessionService } from "@/lib/services/conversation-session-service";
import type { ConversationSessionRepository } from "@/lib/repositories/conversation-session-repository";
import type { ConversationSessionSummary } from "@/lib/conversation-types";

const noopRepo: ConversationSessionRepository = {
  createSession: async () => {
    throw new Error("not used in these tests");
  },
  getActiveSession: async () => null,
  renewSession: async () => {
    throw new Error("not used in these tests");
  },
  expireSessions: async () => undefined,
  sessionRemaining: async () => 0,
};

function session(overrides: Partial<ConversationSessionSummary>): ConversationSessionSummary {
  return {
    id: "s1",
    conversationId: "c1",
    activatedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    status: "active",
    ...overrides,
  };
}

describe("ConversationSessionService.isActive", () => {
  const service = new ConversationSessionService(noopRepo);

  it("is false for null/undefined", () => {
    expect(service.isActive(null)).toBe(false);
    expect(service.isActive(undefined)).toBe(false);
  });

  it("is true for status=active with a future expiry", () => {
    expect(service.isActive(session({ status: "active", expiresAt: new Date(Date.now() + 3600_000).toISOString() }))).toBe(true);
  });

  it("is false for status=active but a past expiry (stale, unswept)", () => {
    expect(service.isActive(session({ status: "active", expiresAt: new Date(Date.now() - 1000).toISOString() }))).toBe(false);
  });

  it("is false for status=expired even with a future expiresAt value", () => {
    expect(service.isActive(session({ status: "expired", expiresAt: new Date(Date.now() + 3600_000).toISOString() }))).toBe(false);
  });

  it("is false for pending and refunded", () => {
    expect(service.isActive(session({ status: "pending" }))).toBe(false);
    expect(service.isActive(session({ status: "refunded" }))).toBe(false);
  });
});

describe("ConversationSessionService.getRemainingMs / formatCountdown", () => {
  const service = new ConversationSessionService(noopRepo);

  it("returns 0 for an inactive session", () => {
    expect(service.getRemainingMs(session({ status: "expired" }))).toBe(0);
    expect(service.getRemainingMs(null)).toBe(0);
  });

  it("returns a positive value for an active session and never negative", () => {
    const s = session({ expiresAt: new Date(Date.now() + 5000).toISOString() });
    expect(service.getRemainingMs(s)).toBeGreaterThan(0);
  });

  it('formats as "Xh Ym" above an hour and "Ym" below', () => {
    expect(service.formatCountdown(23 * 60 * 60 * 1000 + 12 * 60 * 1000)).toBe("23h 12m");
    expect(service.formatCountdown(5 * 60 * 1000)).toBe("5m");
    expect(service.formatCountdown(0)).toBe("0m");
  });
});

describe("ConversationSessionService.calculateExpiry", () => {
  const service = new ConversationSessionService(noopRepo);

  it("adds the given duration in hours", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const expiry = service.calculateExpiry(start, 24);
    expect(expiry.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("defaults to 24 hours", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    expect(service.calculateExpiry(start).toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });
});
