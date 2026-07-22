import { describe, expect, it } from "vitest";
import { validateMessageBody, MAX_MESSAGE_LENGTH } from "@/lib/services/messaging-service";
import { classifyMessagingError, messagingErrorMessage } from "@/lib/auth/errors";

describe("validateMessageBody", () => {
  it("accepts a normal message and trims it", () => {
    const result = validateMessageBody("  Hey there!  ");
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.body).toBe("Hey there!");
  });

  it("rejects an empty message", () => {
    expect(validateMessageBody("")).toEqual({ valid: false, reason: "empty-message" });
  });

  it("rejects a whitespace-only message", () => {
    expect(validateMessageBody("   \n\t  ")).toEqual({ valid: false, reason: "empty-message" });
  });

  it("rejects a message over the max length", () => {
    const tooLong = "a".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(validateMessageBody(tooLong)).toEqual({ valid: false, reason: "message-too-long" });
  });

  it("accepts a message exactly at the max length", () => {
    const exact = "a".repeat(MAX_MESSAGE_LENGTH);
    expect(validateMessageBody(exact).valid).toBe(true);
  });
});

describe("classifyMessagingError", () => {
  it("classifies an expired session", () => {
    expect(classifyMessagingError(new Error("Chat access has expired for this conversation."))).toBe("session-expired");
  });
  it("classifies a non-participant", () => {
    expect(classifyMessagingError(new Error("Only a participant in this conversation may send a message."))).toBe(
      "unauthorized-conversation"
    );
  });
  it("classifies rate limiting", () => {
    expect(classifyMessagingError(new Error("You are sending messages too quickly. Please wait a moment and try again."))).toBe(
      "rate-limited"
    );
  });
  it("classifies an unapproved creator", () => {
    expect(classifyMessagingError(new Error("This creator is not currently approved for messaging."))).toBe(
      "unauthorized-conversation"
    );
  });
  it("classifies a network failure", () => {
    expect(classifyMessagingError(new Error("fetch failed"))).toBe("network-failure");
  });
  it("falls back to unknown without leaking the raw error", () => {
    expect(classifyMessagingError(new Error("some very specific internal database detail"))).toBe("unknown");
  });
  it("never throws on a non-Error input", () => {
    expect(() => classifyMessagingError(undefined)).not.toThrow();
    expect(() => classifyMessagingError("plain string")).not.toThrow();
  });
});

describe("messagingErrorMessage", () => {
  it("returns a friendly, non-raw message for every code", () => {
    for (const code of ["session-expired", "unauthorized-conversation", "message-too-long", "empty-message", "rate-limited", "network-failure", "unknown"] as const) {
      const message = messagingErrorMessage(code);
      expect(message.length).toBeGreaterThan(0);
      expect(message.toLowerCase()).not.toContain("postgres");
      expect(message.toLowerCase()).not.toContain("sql");
    }
  });
});
