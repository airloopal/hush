import { readStorage, removeStorage, writeStorage } from "@/lib/storage";
import type { DemoUser, DemoUserRole } from "@/lib/demo-auth-types";

export const DEMO_SESSION_KEY = "hush:demo-session";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
}

function isValidDemoUser(value: unknown): value is DemoUser {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  const validRole = (role: unknown): role is DemoUserRole => role === "fan" || role === "creator";
  return (
    isNonEmptyString(u.id) &&
    isNonEmptyString(u.username) &&
    isNonEmptyString(u.email) &&
    isNonEmptyString(u.displayName) &&
    validRole(u.role) &&
    (u.avatar === undefined || typeof u.avatar === "string") &&
    (u.category === undefined || typeof u.category === "string") &&
    u.isDemo === true &&
    isValidIsoDate(u.createdAt)
  );
}

/** Reads the raw session record, ignoring anything malformed. This file is
 * the only place hush:demo-session is read or written — everything else
 * (pages, components) goes through lib/demo-auth.ts. */
export function readDemoSessionRaw(): DemoUser | null {
  const raw = readStorage<unknown>(DEMO_SESSION_KEY);
  return isValidDemoUser(raw) ? raw : null;
}

export function writeDemoSessionRaw(user: DemoUser): void {
  writeStorage(DEMO_SESSION_KEY, user);
}

export function removeDemoSessionRaw(): void {
  removeStorage(DEMO_SESSION_KEY);
}
