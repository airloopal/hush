import { ADULT_CATEGORY } from "@/lib/categories";
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from "@/lib/storage";
import type { Account, OnboardingDraft, OnboardingState, OnboardingStep } from "@/lib/types";

// ---------------------------------------------------------------------------
// Account (hush:account)
// ---------------------------------------------------------------------------

export function getAccount(): Account | null {
  return readStorage<Account>(STORAGE_KEYS.account);
}

export function saveAccount(account: Account): void {
  writeStorage(STORAGE_KEYS.account, account);
}

export function isOnboardingComplete(): boolean {
  return getAccount() !== null;
}

/** True only for a fan who selected Adult 18+ and explicitly confirmed. */
export function hasAdultAccess(account: Account | null): boolean {
  if (!account || account.role !== "fan") return false;
  return account.interests.includes(ADULT_CATEGORY) && account.adultConfirmed === true;
}

/** Where a completed account should land when it hits onboarding or "/". */
export function homeRouteForAccount(account: Account): string {
  return account.role === "creator" ? "/dashboard" : "/discover";
}

// ---------------------------------------------------------------------------
// Onboarding draft (hush:onboarding-state)
// ---------------------------------------------------------------------------

export function getOnboardingState(): OnboardingState | null {
  return readStorage<OnboardingState>(STORAGE_KEYS.onboarding);
}

export function saveOnboardingState(step: OnboardingStep, draft: OnboardingDraft): void {
  writeStorage<OnboardingState>(STORAGE_KEYS.onboarding, { step, draft });
}

export function updateOnboardingDraft(
  step: OnboardingStep,
  patch: Partial<OnboardingDraft>
): OnboardingDraft {
  const existing = getOnboardingState();
  const draft: OnboardingDraft = { ...(existing?.draft ?? {}), ...patch };
  saveOnboardingState(step, draft);
  return draft;
}

export function clearOnboardingState(): void {
  removeStorage(STORAGE_KEYS.onboarding);
}

// ---------------------------------------------------------------------------
// Dev-only reset
// ---------------------------------------------------------------------------

export function resetLocalAccount(): void {
  removeStorage(STORAGE_KEYS.account);
  removeStorage(STORAGE_KEYS.onboarding);
}
