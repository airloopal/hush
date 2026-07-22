"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FanPaymentRecord } from "@/lib/payment-types";

/** Client-safe — reads through fan_payment_history, which is already
 * scoped to auth.uid() = fan_id via RLS (see migration
 * 20260701000021_payment_rls_and_views.sql). Resolves creator usernames
 * for display, same pattern as lib/repositories/supabase/message-queries.ts. */
export async function getFanPaymentHistoryBrowser(): Promise<(FanPaymentRecord & { creatorUsername: string })[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("fan_payment_history").select("*").order("created_at", { ascending: false });
  if (error) throw error;

  const usernameCache = new Map<string, string>();
  const results: (FanPaymentRecord & { creatorUsername: string })[] = [];
  for (const row of data ?? []) {
    if (!usernameCache.has(row.creator_id)) {
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", row.creator_id).maybeSingle();
      usernameCache.set(row.creator_id, profile?.username ?? row.creator_id);
    }
    results.push({
      id: row.id,
      creatorId: row.creator_id,
      creatorUsername: usernameCache.get(row.creator_id)!,
      conversationId: row.conversation_id,
      amountMinor: row.amount_minor,
      currency: row.currency,
      productType: "chat_day_pass",
      internalStatus: row.internal_status,
      providerReference: row.provider_reference,
      paidAt: row.paid_at,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
    });
  }
  return results;
}
