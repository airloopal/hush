import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseProfileRepository, supabaseCreatorRepository } from "@/lib/repositories/index";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type CreatorProfileRow = Database["public"]["Tables"]["creator_profiles"]["Row"];

export interface CurrentUser {
  id: string;
  email: string | null;
  profile: ProfileRow;
  role: ProfileRow["role"];
  onboardingCompleted: boolean;
  creatorProfile: CreatorProfileRow | null;
}

export type CurrentUserResult =
  | { status: "signed-out" }
  | { status: "missing-profile"; authUserId: string }
  | { status: "blocked"; reason: "suspended" | "banned" | "deleted" }
  | { status: "ok"; user: CurrentUser };

/**
 * Server-only. The one place that resolves "who is the current user" for
 * Supabase mode — combines the auth session with the profiles row (via
 * ProfileRepository) and, if relevant, the creator_profiles row (via
 * CreatorRepository). Pages/middleware should call this instead of
 * querying Supabase directly.
 */
export async function getCurrentUserResult(): Promise<CurrentUserResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return { status: "signed-out" };

  const profile = await supabaseProfileRepository.getById(authUser.id);
  if (!profile) return { status: "missing-profile", authUserId: authUser.id };

  if (profile.status === "suspended") return { status: "blocked", reason: "suspended" };
  if (profile.status === "banned") return { status: "blocked", reason: "banned" };
  if (profile.status === "deleted") return { status: "blocked", reason: "deleted" };

  const creatorProfile =
    profile.role === "creator" ? await supabaseCreatorRepository.getOwnCreatorProfile(authUser.id) : null;

  return {
    status: "ok",
    user: {
      id: authUser.id,
      email: authUser.email ?? null,
      profile,
      role: profile.role,
      onboardingCompleted: profile.onboarding_completed,
      creatorProfile,
    },
  };
}
