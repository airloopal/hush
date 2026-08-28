import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Records an admin action to admin_audit_log (§9). Thin wrapper over the
 * log_admin_action RPC, which independently verifies the caller is staff
 * and always attributes the action to auth.uid() server-side — this
 * function can't be used to forge an entry for someone else. Every admin
 * mutation (approve/reject/suspend/verify/withdrawal decision/moderation
 * outcome) should call this after the underlying change succeeds. */
export async function logAdminAction(
  action: string,
  targetType: string,
  targetId?: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("log_admin_action", {
    p_action: action,
    p_target_type: targetType,
    p_target_id: targetId ?? null,
    p_metadata: metadata,
  });
  if (error) {
    // Audit logging is important but shouldn't take down an otherwise-
    // successful admin action if it fails — log server-side for
    // visibility rather than throwing out to the caller.
    console.error("[admin audit log] failed to record action:", action, error);
  }
}
