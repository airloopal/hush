import { describe, expect, it, beforeEach, afterEach } from "vitest";

const ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
let originalValues: Record<string, string | undefined> = {};

beforeEach(() => {
  originalValues = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalValues[key] === undefined) delete process.env[key];
    else process.env[key] = originalValues[key];
  }
});

describe("demo mode fallback", () => {
  it("is demo mode when Supabase env vars are absent", async () => {
    const { isDemoMode } = await import("@/lib/auth/mode");
    expect(isDemoMode()).toBe(true);
  });

  it("is NOT demo mode once both public Supabase env vars are present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const { isDemoMode } = await import("@/lib/auth/mode");
    expect(isDemoMode()).toBe(false);
  });

  it("stays in demo mode if only one of the two public env vars is set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const { isDemoMode } = await import("@/lib/auth/mode");
    expect(isDemoMode()).toBe(true);
  });
});
