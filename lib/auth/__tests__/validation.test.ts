import { describe, expect, it } from "vitest";
import {
  isAtLeast18,
  validateDateOfBirth,
  validateEmail,
  validatePasswordStrength,
  validatePasswordsMatch,
  validateSignupUsername,
} from "@/lib/auth/validation";

describe("validateEmail", () => {
  it("accepts a well-formed email", () => {
    expect(validateEmail("alex@example.com").valid).toBe(true);
  });
  it("rejects missing @ or domain", () => {
    expect(validateEmail("alex").valid).toBe(false);
    expect(validateEmail("alex@").valid).toBe(false);
    expect(validateEmail("").valid).toBe(false);
  });
});

describe("validateSignupUsername", () => {
  it("accepts a normal username", () => {
    expect(validateSignupUsername("alex_m1").valid).toBe(true);
  });
  it("rejects too short / too long / bad characters", () => {
    expect(validateSignupUsername("ab").valid).toBe(false);
    expect(validateSignupUsername("a".repeat(21)).valid).toBe(false);
    expect(validateSignupUsername("Alex Morgan!").valid).toBe(false);
  });
  it("rejects reserved usernames case-insensitively", () => {
    expect(validateSignupUsername("admin").valid).toBe(false);
    expect(validateSignupUsername("ADMIN").valid).toBe(false);
    expect(validateSignupUsername("support").valid).toBe(false);
  });
});

describe("validatePasswordStrength", () => {
  it("accepts a reasonable password", () => {
    expect(validatePasswordStrength("correcthorse1").valid).toBe(true);
  });
  it("rejects short passwords", () => {
    expect(validatePasswordStrength("abc123").valid).toBe(false);
  });
  it("rejects letters-only passwords with no number/symbol", () => {
    expect(validatePasswordStrength("onlyletters").valid).toBe(false);
  });
});

describe("validatePasswordsMatch", () => {
  it("passes when equal, fails when not", () => {
    expect(validatePasswordsMatch("abc12345", "abc12345").valid).toBe(true);
    expect(validatePasswordsMatch("abc12345", "different").valid).toBe(false);
  });
});

describe("isAtLeast18 / validateDateOfBirth", () => {
  it("accepts someone who turned 18 exactly today", () => {
    const eighteenYearsAgoToday = new Date();
    eighteenYearsAgoToday.setFullYear(eighteenYearsAgoToday.getFullYear() - 18);
    const iso = eighteenYearsAgoToday.toISOString().slice(0, 10);
    expect(isAtLeast18(iso)).toBe(true);
    expect(validateDateOfBirth(iso).valid).toBe(true);
  });

  it("rejects someone who is 17", () => {
    const seventeenYearsAgo = new Date();
    seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17);
    const iso = seventeenYearsAgo.toISOString().slice(0, 10);
    expect(isAtLeast18(iso)).toBe(false);
    expect(validateDateOfBirth(iso).valid).toBe(false);
  });

  it("rejects garbage input", () => {
    expect(isAtLeast18("not-a-date")).toBe(false);
    expect(validateDateOfBirth("").valid).toBe(false);
  });
});
