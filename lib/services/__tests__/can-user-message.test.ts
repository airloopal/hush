import { describe, expect, it } from "vitest";
import { evaluateCanUserMessage, type CanUserMessageFacts } from "@/lib/services/can-user-message";
import type { ConversationSummary, ConversationSessionSummary } from "@/lib/conversation-types";

const conversation: ConversationSummary = {
  id: "c1",
  creatorId: "creator-uuid",
  creatorUsername: "mayaokoye",
  fanId: "fan-uuid",
  fanUsername: "alexm",
  latestMessageAt: null,
  latestMessagePreview: null,
  createdAt: new Date().toISOString(),
};

const activeSession: ConversationSessionSummary = {
  id: "s1",
  conversationId: "c1",
  activatedAt: new Date(Date.now() - 1000).toISOString(),
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  status: "active",
};

function baseFacts(overrides: Partial<CanUserMessageFacts> = {}): CanUserMessageFacts {
  return {
    userId: "fan-uuid",
    conversation,
    activeSession,
    creatorApproved: true,
    accountActive: true,
    ...overrides,
  };
}

describe("evaluateCanUserMessage", () => {
  it("allows a participant with an active session, approved creator, active account", () => {
    expect(evaluateCanUserMessage(baseFacts())).toEqual({ allowed: true });
  });

  it("allows the creator side of the conversation too", () => {
    expect(evaluateCanUserMessage(baseFacts({ userId: "creator-uuid" }))).toEqual({ allowed: true });
  });

  it("denies an unauthenticated caller", () => {
    expect(evaluateCanUserMessage(baseFacts({ userId: null }))).toEqual({
      allowed: false,
      reason: "unauthenticated",
    });
  });

  it("denies someone who isn't a participant", () => {
    expect(evaluateCanUserMessage(baseFacts({ userId: "some-other-uuid" }))).toEqual({
      allowed: false,
      reason: "not-participant",
    });
  });

  it("denies when the conversation doesn't exist", () => {
    expect(evaluateCanUserMessage(baseFacts({ conversation: null }))).toEqual({
      allowed: false,
      reason: "not-participant",
    });
  });

  it("denies a suspended/banned account", () => {
    expect(evaluateCanUserMessage(baseFacts({ accountActive: false }))).toEqual({
      allowed: false,
      reason: "account-not-active",
    });
  });

  it("denies when the creator is not approved", () => {
    expect(evaluateCanUserMessage(baseFacts({ creatorApproved: false }))).toEqual({
      allowed: false,
      reason: "creator-not-approved",
    });
  });

  it("denies when there is no active session", () => {
    expect(evaluateCanUserMessage(baseFacts({ activeSession: null }))).toEqual({
      allowed: false,
      reason: "no-active-session",
    });
  });

  it("denies when the session is expired even if status still says active (stale)", () => {
    const stale: ConversationSessionSummary = { ...activeSession, expiresAt: new Date(Date.now() - 1000).toISOString() };
    expect(evaluateCanUserMessage(baseFacts({ activeSession: stale }))).toEqual({
      allowed: false,
      reason: "no-active-session",
    });
  });

  it("checks account-active and creator-approved before session state", () => {
    // A banned account with no active session should still report the
    // account reason first — the more fundamental denial.
    const result = evaluateCanUserMessage(baseFacts({ accountActive: false, activeSession: null }));
    expect(result.reason).toBe("account-not-active");
  });
});
