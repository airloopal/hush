export type StaffRole = "support" | "moderator" | "admin" | "super_admin";
export const STAFF_ROLES: readonly StaffRole[] = ["support", "moderator", "admin", "super_admin"];
export const PRIVILEGED_STAFF_ROLES: readonly StaffRole[] = ["moderator", "admin", "super_admin"];

export function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function isPrivilegedStaffRole(role: string): boolean {
  return (PRIVILEGED_STAFF_ROLES as readonly string[]).includes(role);
}

export function isSuperAdminRole(role: string): boolean {
  return role === "super_admin";
}

/**
 * UI-only capability matrix — drives which buttons/actions render for the
 * current staff member. This is never the actual authorization boundary:
 * every mutation this gates is independently re-checked server-side
 * (RLS + is_privileged_staff()/is_super_admin(), or the Server Action's
 * own requireStaff()/requirePrivilegedStaff() call — see
 * lib/admin/require-staff.ts). A compromised or modified client can hide
 * or show whatever buttons it wants; it still can't perform an action the
 * database itself doesn't permit for that user's real role.
 */
export const ADMIN_CAPABILITIES = {
  viewDashboard: STAFF_ROLES,
  viewUsers: STAFF_ROLES,
  suspendUsers: PRIVILEGED_STAFF_ROLES,
  viewCreators: STAFF_ROLES,
  approveCreators: PRIVILEGED_STAFF_ROLES,
  verifyCreators: PRIVILEGED_STAFF_ROLES,
  viewPayments: STAFF_ROLES,
  viewPayouts: STAFF_ROLES,
  decidePayouts: PRIVILEGED_STAFF_ROLES,
  viewReports: STAFF_ROLES,
  triageReports: STAFF_ROLES,
  viewBlocks: STAFF_ROLES,
  unblock: STAFF_ROLES,
  viewAuditLog: STAFF_ROLES,
  changeStaffRoles: ["super_admin"] as readonly StaffRole[],
} as const;

export type AdminCapability = keyof typeof ADMIN_CAPABILITIES;

export function canStaffRole(role: string, capability: AdminCapability): boolean {
  return (ADMIN_CAPABILITIES[capability] as readonly string[]).includes(role);
}
