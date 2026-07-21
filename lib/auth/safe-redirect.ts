/**
 * The one place that decides whether a `next`/redirect-target string is
 * safe to send a browser to. Used by middleware.ts, /login, and
 * /auth/callback — previously each had its own slightly different copy of
 * this check; consolidated here so there's a single, unit-tested
 * implementation instead of three that could silently drift apart.
 */
export function isSafeRedirectPath(value: string): boolean {
  if (!value) return false;
  if (!value.startsWith("/")) return false; // must be relative
  if (value.startsWith("//")) return false; // protocol-relative → different origin
  if (value.includes("://")) return false; // absolute URL smuggled into a path-looking string
  return true;
}

/** Returns `value` if safe, otherwise `fallback` (default: `null`). */
export function safeRedirectPath(value: string | null | undefined, fallback: string | null = null): string | null {
  if (value && isSafeRedirectPath(value)) return value;
  return fallback;
}
