import { readDemoSessionRaw, removeDemoSessionRaw, writeDemoSessionRaw } from "@/lib/demo-session-storage";
import { getAccount, saveAccount } from "@/lib/account";
import { removeStorage, STORAGE_KEYS } from "@/lib/storage";
import type { DemoUser } from "@/lib/demo-auth-types";
import type { Account, CreatorAccount, FanAccount } from "@/lib/types";
import type { Category } from "@/lib/categories";

/**
 * Bridge only — NOT a second auth system.
 *
 * The rest of the app (Discover, Dashboard, Settings, chat, etc.) was built
 * across earlier stages against `hush:account` (see lib/account.ts) and
 * expects the richer FanAccount/CreatorAccount shape (interests, pricing,
 * bio...). Rather than rewrite every one of those pages for this
 * auth-only sprint, a demo login mirrors the signed-in DemoUser into that
 * existing store, so `useRequireAccount()` keeps working exactly as it did
 * before. `hush:demo-session` remains the single source of truth for "who
 * is logged in" — this function only keeps the legacy record in sync with
 * it, and only overwrites the legacy account when identity actually
 * changes, so in-demo edits (e.g. from Settings) persist across reloads.
 */
function syncLegacyAccountFromDemoUser(user: DemoUser): void {
  const existing = getAccount();
  if (existing && existing.username === user.username && existing.role === user.role) {
    return; // Already synced for this identity — preserve any local edits.
  }

  const account: Account =
    user.role === "fan"
      ? ({
          role: "fan",
          username: user.username,
          interests: ["Gaming", "Music", "Fitness", "Lifestyle"],
          adultConfirmed: false,
          createdAt: user.createdAt,
        } satisfies FanAccount)
      : ({
          role: "creator",
          username: user.username,
          category: (user.category as Category) ?? "Lifestyle",
          bio: "Lifestyle creator sharing daily moments, travel, and honest conversations.",
          avatarDataUrl: user.avatar,
          pricing: { chatPrice: "19.00", photoPrice: "9.00", videoPrice: "29.00" },
          isAdult: false,
          adultConfirmed: false,
          createdAt: user.createdAt,
          responseTimeMinutes: 15,
        } satisfies CreatorAccount);

  saveAccount(account);
}

// ---------------------------------------------------------------------------
// Public API — the only functions any page/component should call.
// ---------------------------------------------------------------------------

export function getSession(): DemoUser | null {
  return readDemoSessionRaw();
}

export function setSession(user: DemoUser): void {
  writeDemoSessionRaw(user);
  syncLegacyAccountFromDemoUser(user);
}

/** Clears the demo session and the synced legacy account, but never touches
 * chat/purchase/notification/trust data — logging out does not delete
 * seeded demo activity. Production auth would clear a real session/token
 * here instead. */
export function clearSession(): void {
  removeDemoSessionRaw();
  removeStorage(STORAGE_KEYS.account);
  removeStorage(STORAGE_KEYS.onboarding);
}

export function getCurrentUser(): DemoUser | null {
  return readDemoSessionRaw();
}

export function isFan(): boolean {
  return getCurrentUser()?.role === "fan";
}

export function isCreator(): boolean {
  return getCurrentUser()?.role === "creator";
}

/** What a protected page/component calls to find out who's signed in. A
 * production build would replace this with a real server-verified session
 * check. Returns null rather than throwing — callers (see
 * lib/use-demo-session.ts) decide how to redirect. */
export function requireSession(): DemoUser | null {
  return getCurrentUser();
}

export function homeRouteForRole(role: DemoUser["role"]): string {
  return role === "creator" ? "/dashboard" : "/discover";
}
