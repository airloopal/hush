"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Client-side throttle, in addition to the server-side one in
// touch_presence() (belt and suspenders — the server-side throttle is the
// real guarantee; this just avoids firing pointless network calls).
const CLIENT_THROTTLE_MS = 25_000;
let lastTouchAt = 0;

/** Records "this user is active right now" — the only way `user_presence`
 * is ever written (§10: "users cannot manually set themselves online").
 * Safe to call as often as convenient; throttled both here and in the
 * database function it calls. */
export function touchPresence(): void {
  const now = Date.now();
  if (now - lastTouchAt < CLIENT_THROTTLE_MS) return;
  lastTouchAt = now;
  void createSupabaseBrowserClient().rpc("touch_presence");
}

/** Wires touchPresence() to real user interaction and tab visibility,
 * with sensible throttling — call once per mounted conversation view.
 * Returns a cleanup function. */
export function startPresenceHeartbeat(): () => void {
  const handleActivity = () => touchPresence();
  const handleVisibility = () => {
    if (document.visibilityState === "visible") touchPresence();
  };

  touchPresence();
  window.addEventListener("focus", handleActivity);
  document.addEventListener("visibilitychange", handleVisibility);
  // A small set of interaction events, not every possible one — enough to
  // reflect real activity without turning into a firehose.
  window.addEventListener("pointerdown", handleActivity, { passive: true });
  window.addEventListener("keydown", handleActivity);

  return () => {
    window.removeEventListener("focus", handleActivity);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("pointerdown", handleActivity);
    window.removeEventListener("keydown", handleActivity);
  };
}

export type PresenceLabel = "Online" | "Active now" | "Last seen recently" | string | "Offline";

/**
 * §10's five states, derived purely from timestamps — never a stored
 * boolean. "Online"/"Active now" within 2 minutes, "Last seen recently"
 * within an hour, then a formatted time, then "Offline" (never seen, or
 * not seen in a long while).
 */
export function formatPresenceLabel(lastActiveAt: string | null, now: number = Date.now()): PresenceLabel {
  if (!lastActiveAt) return "Offline";
  const ageMs = now - new Date(lastActiveAt).getTime();
  if (ageMs < 0) return "Online";
  if (ageMs < 2 * 60 * 1000) return "Active now";
  if (ageMs < 60 * 60 * 1000) return "Last seen recently";
  if (ageMs < 7 * 24 * 60 * 60 * 1000) {
    return `Last seen ${new Date(lastActiveAt).toLocaleDateString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`;
  }
  return "Offline";
}
