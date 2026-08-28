import "server-only";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/auth/mode";
import { getCurrentUserResult } from "@/lib/auth/current-user";
import { isStaffRole, isPrivilegedStaffRole, isSuperAdminRole, type StaffRole } from "@/lib/admin/permissions";

export interface StaffUser {
  id: string;
  username: string | null;
  role: StaffRole;
}

/**
 * The actual authorization boundary for the entire admin portal (§1, §12).
 * Called from app/admin/layout.tsx, which wraps every admin route — so
 * every page under /admin is protected by this one call, server-side,
 * before any admin data is fetched or rendered.
 *
 * Deliberately uses notFound() rather than a redirect for non-staff: a
 * redirect to /login (or anywhere) confirms to an unauthorized but
 * authenticated user that /admin/* exists and is being gated — a plain
 * 404 discloses nothing, matching the same choice already made for
 * app/dev/diagnostics/page.tsx. An unauthenticated visitor is redirected
 * to /login by middleware before ever reaching this check at all (/admin
 * is not in middleware's PUBLIC_ROUTES).
 *
 * There is no "demo admin" — the admin portal is a real-Supabase-only
 * feature (demo mode has no staff roles at all), so demo mode 404s
 * immediately here, before ever calling getCurrentUserResult(), which is
 * Supabase-only and would otherwise throw a configuration error rather
 * than a clean not-found.
 */
export async function requireStaff(): Promise<StaffUser> {
  if (isDemoMode()) {
    notFound();
  }
  const result = await getCurrentUserResult();
  if (result.status !== "ok" || !isStaffRole(result.user.role)) {
    notFound();
  }
  return { id: result.user.id, username: result.user.profile.username, role: result.user.role as StaffRole };
}

/** For Server Actions performing a moderator/admin/super_admin-only
 * mutation (e.g. approving a withdrawal) — throws rather than calling
 * notFound(), since a Server Action has no page to render a 404 for; the
 * caller should catch and surface a friendly error. */
export async function requirePrivilegedStaff(): Promise<StaffUser> {
  const staff = await requireStaff();
  if (!isPrivilegedStaffRole(staff.role)) {
    throw new Error("This action requires a moderator, admin, or super_admin role.");
  }
  return staff;
}

export async function requireSuperAdmin(): Promise<StaffUser> {
  const staff = await requireStaff();
  if (!isSuperAdminRole(staff.role)) {
    throw new Error("This action requires the super_admin role.");
  }
  return staff;
}
