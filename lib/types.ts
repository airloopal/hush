import type { Category } from "@/lib/categories";

export type AccountRole = "fan" | "creator";

export type OnboardingStep =
  | "account-type"
  | "username"
  | "fan"
  | "creator"
  | "creator-preview";

/**
 * In-progress onboarding data. Nothing here is a finished account — the
 * draft is promoted to a real Account (see below) only once the flow
 * completes, at which point it's cleared.
 */
export interface OnboardingDraft {
  role?: AccountRole;
  username?: string;

  // Fan-only fields
  interests?: Category[];
  adultConfirmed?: boolean;

  // Creator-only fields
  category?: Category;
  bio?: string;
  avatarDataUrl?: string;
  chatPrice?: string;
  photoPrice?: string;
  videoPrice?: string;
}

export interface OnboardingState {
  step: OnboardingStep;
  draft: OnboardingDraft;
}

export interface FanAccount {
  role: "fan";
  username: string;
  interests: Category[];
  adultConfirmed: boolean;
  adultConfirmedAt?: string;
  createdAt: string;
}

export interface CreatorPricing {
  // Prototype only: prices are stored as decimal strings (e.g. "19.99") for
  // simple form binding and display. A production build must store money as
  // integer minor units (e.g. chatPriceCents: number) to avoid floating
  // point and locale rounding bugs, and convert to a display string only
  // at render time.
  chatPrice: string;
  photoPrice: string;
  videoPrice: string;
}

export interface CreatorAccount {
  role: "creator";
  username: string;
  category: Category;
  bio: string;
  avatarDataUrl?: string;
  pricing: CreatorPricing;
  isAdult: boolean;
  adultConfirmed: boolean;
  adultConfirmedAt?: string;
  createdAt: string;
  /** Self-reported average reply time in minutes, editable from Settings. */
  responseTimeMinutes?: number;
}

export type Account = FanAccount | CreatorAccount;

export interface MockCreator {
  id: string;
  username: string;
  avatarUrl?: string;
  category: Category;
  bio: string;
  /** Minutes since last activity; ignored while isOnline is true. */
  lastSeenMinutes: number;
  isOnline: boolean;
  averageReplyMinutes: number;
  // Decimal strings — see the note on CreatorPricing above.
  chatPrice: string;
  photoPrice: string;
  videoPrice: string;
  joinedAt: string;
  isNew: boolean;
  /** ISO timestamp; a sponsored boost is active while this is in the future. */
  boostEndsAt?: string;
  isAdult: boolean;
}
