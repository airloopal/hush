import { describe, expect, it } from "vitest";
import { classifySupabaseAuthError } from "@/lib/auth/errors";
import { isReservedUsername } from "@/lib/auth/reserved-usernames";

describe("classifySupabaseAuthError", () => {
  it("classifies invalid login credentials", () => {
    expect(classifySupabaseAuthError(new Error("Invalid login credentials"))).toBe("invalid-credentials");
  });
  it("classifies an unverified email", () => {
    expect(classifySupabaseAuthError(new Error("Email not confirmed"))).toBe("email-not-verified");
  });
  it("classifies an expired/invalid link", () => {
    expect(classifySupabaseAuthError(new Error("Token has expired or is invalid"))).toBe("expired-link");
  });
  it("classifies a duplicate email on signup", () => {
    expect(classifySupabaseAuthError(new Error("User already registered"))).toBe("duplicate-email");
  });
  it("classifies rate limiting", () => {
    expect(classifySupabaseAuthError(new Error("Email rate limit exceeded"))).toBe("rate-limited");
  });
  it("classifies a network failure", () => {
    expect(classifySupabaseAuthError(new Error("fetch failed"))).toBe("network-failure");
  });
  it("falls back to unknown for an unrecognized error, without leaking it", () => {
    const code = classifySupabaseAuthError(new Error("some very specific internal database detail"));
    expect(code).toBe("unknown");
  });
  it("never throws on a non-Error input", () => {
    expect(() => classifySupabaseAuthError(undefined)).not.toThrow();
    expect(() => classifySupabaseAuthError("plain string")).not.toThrow();
    expect(() => classifySupabaseAuthError({ message: "weird password too short" })).not.toThrow();
  });
});

describe("isReservedUsername", () => {
  it("blocks known-reserved names case-insensitively", () => {
    expect(isReservedUsername("admin")).toBe(true);
    expect(isReservedUsername("Admin")).toBe(true);
    expect(isReservedUsername("SUPPORT")).toBe(true);
  });
  it("blocks the app's own route names to avoid /username collisions", () => {
    expect(isReservedUsername("discover")).toBe(true);
    expect(isReservedUsername("settings")).toBe(true);
    expect(isReservedUsername("dashboard")).toBe(true);
  });
  it("allows an ordinary username", () => {
    expect(isReservedUsername("alexmorgan")).toBe(false);
  });
});
