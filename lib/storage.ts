/**
 * Typed localStorage helpers for the Stage 1 prototype. No backend, no
 * cookies, no server session — everything here is local-only and
 * best-effort (private browsing / storage quota failures are swallowed).
 */

export const STORAGE_KEYS = {
  onboarding: "hush:onboarding-state",
  account: "hush:account",
} as const;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readStorage<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/serialization errors in this prototype.
  }
}

export function removeStorage(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}
