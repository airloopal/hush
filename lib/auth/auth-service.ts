"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { classifySupabaseAuthError, type AuthErrorCode } from "@/lib/auth/errors";
import { isReservedUsername } from "@/lib/auth/reserved-usernames";
import { isDemoMode } from "@/lib/auth/mode";
import { clearSession } from "@/lib/demo-auth";

export interface AuthResult {
  ok: boolean;
  errorCode?: AuthErrorCode;
}

export interface SignUpParams {
  email: string;
  password: string;
  displayName: string;
  username: string;
  accountType: "fan" | "creator";
  dateOfBirth: string;
  adultContentEnabled: boolean;
}

/**
 * Only display_name, username, and account_type_requested are ever passed
 * as signup metadata — role is intentionally never included here. The
 * database's handle_new_user() trigger (see supabase/migrations) doesn't
 * read account_type_requested either; it always creates the profile as
 * `fan`. account_type_requested is carried through purely so the client
 * can route a creator signup into the creator onboarding flow after email
 * verification — it has zero authority over the actual `role` column.
 */
export async function signUp(params: SignUpParams): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();
  const normalizedUsername = params.username.trim().toLowerCase();

  if (isReservedUsername(normalizedUsername)) {
    return { ok: false, errorCode: "duplicate-username" };
  }

  const { error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        display_name: params.displayName.trim(),
        username: normalizedUsername,
        account_type_requested: params.accountType,
        date_of_birth: params.dateOfBirth,
        adult_content_enabled: params.adultContentEnabled,
      },
    },
  });

  if (error) return { ok: false, errorCode: classifySupabaseAuthError(error) };
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, errorCode: classifySupabaseAuthError(error) };
  return { ok: true };
}

export async function signOutOfSupabase(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  // Deliberately ignore the result — see docs/authentication-flow.md on
  // why the UI always shows the same neutral confirmation regardless of
  // whether the account exists (prevents email enumeration).
  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
  });
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, errorCode: classifySupabaseAuthError(error) };
  return { ok: true };
}

/** Clears both a real Supabase session and any local demo session,
 * regardless of which mode is currently active — defends against a stale
 * demo session lingering after Supabase becomes configured (§13). */
export async function signOutEverywhere(): Promise<void> {
  clearSession();
  if (!isDemoMode()) {
    await signOutOfSupabase();
  }
}
