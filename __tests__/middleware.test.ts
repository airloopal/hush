import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/middleware";

describe("isPublicPath", () => {
  it("treats the landing page, auth pages, safety, and design-system as public", () => {
    for (const path of ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/safety", "/design-system"]) {
      expect(isPublicPath(path)).toBe(true);
    }
  });

  it("treats Next.js internals and favicon as public (never gated)", () => {
    expect(isPublicPath("/_next/static/chunk.js")).toBe(true);
    expect(isPublicPath("/favicon.ico")).toBe(true);
  });

  it("treats the core authenticated app routes as protected", () => {
    for (const path of ["/discover", "/chats", "/dashboard", "/settings", "/notifications", "/conversations"]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("treats /dev/* as public (the diagnostics page enforces its own access control)", () => {
    expect(isPublicPath("/dev/diagnostics")).toBe(true);
  });

  it("does not treat a route merely starting with 'dev' as public", () => {
    expect(isPublicPath("/devious")).toBe(false);
  });

  it("treats a public-looking prefix that isn't an exact match as protected", () => {
    // Guards against a route-protection gap from overly loose prefix matching.
    expect(isPublicPath("/settings-secret")).toBe(false);
    expect(isPublicPath("/logindoor")).toBe(false);
  });
});
