"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveAccount } from "@/lib/account";
import { isAdultCategory, type Category } from "@/lib/categories";
import type { CreatorAccount, FanAccount } from "@/lib/types";

/**
 * Phase 2.2A note: the rest of the app (Discover, Dashboard, Chats, etc.)
 * still reads the local `hush:account` bridge (see lib/account.ts), not
 * Supabase directly — connecting every page to Supabase is later work
 * (explicitly out of scope: "Do NOT connect conversations to Supabase").
 * So onboarding completion in Supabase mode does two things: writes the
 * real, secure record to Postgres (this is the actual source of truth
 * going forward), AND mirrors it into the local bridge so today's pages
 * keep working immediately, exactly the same dual-write pattern
 * lib/demo-auth.ts already uses for demo sessions.
 *
 * Role stays secure: a creator's `profiles.role` is NOT changed here (only
 * an admin can do that — see the protect_profile_role_status trigger).
 * `creator_profiles` is inserted as `draft` and then self-submitted to
 * `pending_review` (the one self-transition the database explicitly
 * allows — see migration 20260701000014). The local bridge account is
 * what lets this browser preview the creator experience immediately,
 * matching how the existing demo system already works; it carries no
 * authority over the real database.
 */

// Best-effort match against the seeded category slugs (see
// supabase/migrations/20260701000004_categories_table.sql). The app's
// local Category enum doesn't map 1:1 to the seeded list — falls back to
// no primary category rather than guessing wrong.
const CATEGORY_SLUG_OVERRIDES: Partial<Record<Category, string>> = {
  Sports: "sport",
  "Adult 18+": "adult-18-plus",
};

function categorySlug(category: Category): string {
  return CATEGORY_SLUG_OVERRIDES[category] ?? category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export interface CompleteFanOnboardingParams {
  username: string;
  interests: Category[];
  adultConfirmed: boolean;
}

export async function completeFanOnboardingSupabase(params: CompleteFanOnboardingParams): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("profiles")
    .update({
      username: params.username,
      adult_content_enabled: params.adultConfirmed,
      onboarding_completed: true,
    })
    .eq("id", user.id);
  if (error) return false;

  const account: FanAccount = {
    role: "fan",
    username: params.username,
    interests: params.interests,
    adultConfirmed: params.adultConfirmed,
    adultConfirmedAt: params.adultConfirmed ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
  };
  saveAccount(account);
  return true;
}

export interface CompleteCreatorOnboardingParams {
  username: string;
  category: Category;
  bio: string;
  avatarDataUrl?: string;
  chatPrice: string;
  photoPrice: string;
  videoPrice: string;
  adultConfirmed: boolean;
}

function toMinorUnits(decimalString: string): number {
  const value = Number.parseFloat(decimalString);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export async function completeCreatorOnboardingSupabase(params: CompleteCreatorOnboardingParams): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      username: params.username,
      adult_content_enabled: params.adultConfirmed,
      onboarding_completed: true,
    })
    .eq("id", user.id);
  if (profileError) return false;

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug(params.category))
    .maybeSingle();

  const { error: creatorError } = await supabase.from("creator_profiles").upsert({
    user_id: user.id,
    about: params.bio,
    primary_category_id: category?.id ?? null,
    chat_price_minor: toMinorUnits(params.chatPrice),
    photo_price_minor: toMinorUnits(params.photoPrice),
    video_price_minor: toMinorUnits(params.videoPrice),
  });
  if (creatorError) return false;

  if (category?.id) {
    await supabase
      .from("creator_categories")
      .upsert({ creator_id: user.id, category_id: category.id, is_primary: true });
  }

  // Submit for review — the one self-service status transition the
  // database allows (draft -> pending_review only).
  await supabase.from("creator_profiles").update({ status: "pending_review" }).eq("user_id", user.id);

  const account: CreatorAccount = {
    role: "creator",
    username: params.username,
    category: params.category,
    bio: params.bio,
    avatarDataUrl: params.avatarDataUrl,
    pricing: { chatPrice: params.chatPrice, photoPrice: params.photoPrice, videoPrice: params.videoPrice },
    isAdult: isAdultCategory(params.category),
    adultConfirmed: params.adultConfirmed,
    adultConfirmedAt: params.adultConfirmed ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
  };
  saveAccount(account);
  return true;
}
