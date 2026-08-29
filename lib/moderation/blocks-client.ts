"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** All reads/writes here are RLS-scoped to the caller's own blocks
 * (blocker_id = auth.uid()) — see migration
 * 20260701000026_admin_withdrawals_reports_blocks.sql. A user can only
 * ever create or remove their own block, never anyone else's. */

export async function isBlockedPair(otherUserId: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.rpc("is_blocked_pair", { p_user_a: user.id, p_user_b: otherUserId });
  return Boolean(data);
}

export async function hasIBlocked(otherUserId: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", otherUserId)
    .maybeSingle();
  return Boolean(data);
}

export async function blockUser(otherUserId: string, reason?: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { error } = await supabase.from("user_blocks").insert({
    blocker_id: user.id,
    blocked_id: otherUserId,
    reason: reason ?? null,
  });
  if (error) throw error;
}

export async function unblockUser(otherUserId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", otherUserId);
  if (error) throw error;
}
