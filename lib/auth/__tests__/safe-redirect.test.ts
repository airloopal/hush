import { describe, expect, it } from "vitest";
import { isSafeRedirectPath, safeRedirectPath } from "@/lib/auth/safe-redirect";

describe("isSafeRedirectPath", () => {
  it("accepts a plain relative path", () => {
    expect(isSafeRedirectPath("/discover")).toBe(true);
    expect(isSafeRedirectPath("/chats/some-user")).toBe(true);
    expect(isSafeRedirectPath("/settings?tab=safety")).toBe(true);
  });

  it("rejects an empty or missing value", () => {
    expect(isSafeRedirectPath("")).toBe(false);
  });

  it("rejects a value that isn't relative", () => {
    expect(isSafeRedirectPath("discover")).toBe(false);
    expect(isSafeRedirectPath("http://evil.example.com")).toBe(false);
    expect(isSafeRedirectPath("https://evil.example.com/discover")).toBe(false);
  });

  it("rejects a protocol-relative URL (// smuggles a different origin)", () => {
    expect(isSafeRedirectPath("//evil.example.com")).toBe(false);
    expect(isSafeRedirectPath("//evil.example.com/discover")).toBe(false);
  });

  it("rejects an absolute URL smuggled into a path-looking string", () => {
    expect(isSafeRedirectPath("/redirect?to=https://evil.example.com")).toBe(false);
    expect(isSafeRedirectPath("/https://evil.example.com")).toBe(false);
  });

  it("rejects javascript: and data: pseudo-protocols", () => {
    expect(isSafeRedirectPath("javascript:alert(1)")).toBe(false);
    expect(isSafeRedirectPath("data:text/html,<script>alert(1)</script>")).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("returns the value when safe", () => {
    expect(safeRedirectPath("/discover")).toBe("/discover");
  });

  it("returns the fallback (default null) when unsafe", () => {
    expect(safeRedirectPath("https://evil.example.com")).toBe(null);
  });

  it("returns a custom fallback when provided", () => {
    expect(safeRedirectPath("//evil.example.com", "/discover")).toBe("/discover");
  });

  it("returns the fallback for null/undefined input", () => {
    expect(safeRedirectPath(null, "/discover")).toBe("/discover");
    expect(safeRedirectPath(undefined, "/discover")).toBe("/discover");
  });
});
