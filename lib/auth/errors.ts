/**
 * Central, user-facing auth error mapping. Never surface a raw Supabase
 * error message to the UI — always go through `toAuthErrorMessage()` so
 * the wording is consistent and never leaks provider internals.
 */

export type AuthErrorCode =
  | "invalid-credentials"
  | "email-not-verified"
  | "expired-link"
  | "duplicate-email"
  | "duplicate-username"
  | "weak-password"
  | "rate-limited"
  | "network-failure"
  | "suspended-account"
  | "banned-account"
  | "deleted-account"
  | "missing-profile"
  | "configuration-missing"
  | "unknown";

const MESSAGES: Record<AuthErrorCode, string> = {
  "invalid-credentials": "That email and password combination isn't recognized.",
  "email-not-verified": "Please verify your email before logging in — check your inbox for the confirmation link.",
  "expired-link": "That link has expired or was already used. Request a new one and try again.",
  "duplicate-email": "An account with that email already exists. Try logging in instead.",
  "duplicate-username": "That username is already taken. Choose another.",
  "weak-password": "Choose a stronger password — at least 8 characters, with a mix of letters and numbers.",
  "rate-limited": "Too many attempts. Wait a few minutes and try again.",
  "network-failure": "Couldn't reach the server. Check your connection and try again.",
  "suspended-account": "This account has been suspended. Contact support if you think this is a mistake.",
  "banned-account": "This account has been banned.",
  "deleted-account": "This account no longer exists.",
  "missing-profile": "We couldn't find your profile. Please contact support.",
  "configuration-missing": "Authentication isn't configured yet in this environment.",
  unknown: "Something went wrong. Please try again.",
};

export function authErrorMessage(code: AuthErrorCode): string {
  return MESSAGES[code];
}

/** Best-effort classification of a raw Supabase/Postgres error into a safe code. Never rethrows the original message. */
export function classifySupabaseAuthError(error: unknown): AuthErrorCode {
  const raw = extractMessage(error).toLowerCase();

  if (!raw) return "unknown";
  if (raw.includes("invalid login credentials")) return "invalid-credentials";
  if (raw.includes("email not confirmed") || raw.includes("not verified")) return "email-not-verified";
  if (raw.includes("expired") || raw.includes("invalid or expired")) return "expired-link";
  if (raw.includes("already registered") || raw.includes("user already exists")) return "duplicate-email";
  if (raw.includes("duplicate") && raw.includes("username")) return "duplicate-username";
  if (raw.includes("password") && (raw.includes("weak") || raw.includes("short") || raw.includes("at least"))) {
    return "weak-password";
  }
  if (raw.includes("rate limit") || raw.includes("too many requests")) return "rate-limited";
  if (raw.includes("fetch failed") || raw.includes("network")) return "network-failure";
  return "unknown";
}

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "";
}
