/**
 * Demo authentication model for Stage 5A.2.
 *
 * IMPORTANT: this is demo gating only, not real authentication. There is no
 * password hashing, no server-verified session, no token — just a local
 * "who is currently browsing this demo" record. A production build must
 * replace every piece of this module with real auth (e.g. Supabase, Clerk,
 * NextAuth) and a real session store; the call sites that use this module
 * (route guards, the account menu, the login page) are the places that
 * integration would touch.
 */

export type DemoUserRole = "fan" | "creator";

export interface DemoUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: DemoUserRole;
  /** Data URL or undefined — undefined falls back to initials, same as
   * everywhere else in the app (no stock/generated photos of people). */
  avatar?: string;
  /** Creator-only display category. */
  category?: string;
  isDemo: true;
  createdAt: string;
}
