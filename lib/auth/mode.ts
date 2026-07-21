import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * The single source of truth for "is real Supabase auth active, or are we
 * in local demo mode." Pages/components should call this (or the higher-
 * level helpers in lib/auth/auth-service.ts) rather than checking
 * `isSupabaseConfigured()` themselves — keeps the decision in one place.
 */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}
