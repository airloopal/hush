"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PayoutRequest, LedgerEntry, PayoutRequestStatus } from "@/lib/finance-types";

export interface AdminPayoutRow extends PayoutRequest {
  creatorUsername?: string;
}

export async function getAllPayoutRequests(statusFilter?: PayoutRequestStatus): Promise<AdminPayoutRow[]> {
  const supabase = createSupabaseBrowserClient();
  let query = supabase.from("creator_payout_requests").select("*").order("requested_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);
  const { data, error } = await query;
  if (error) throw error;

  const usernameCache = new Map<string, string>();
  const rows: AdminPayoutRow[] = [];
  for (const row of data ?? []) {
    if (!usernameCache.has(row.creator_id)) {
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", row.creator_id).maybeSingle();
      usernameCache.set(row.creator_id, profile?.username ?? row.creator_id);
    }
    rows.push({
      id: row.id,
      creatorId: row.creator_id,
      creatorUsername: usernameCache.get(row.creator_id),
      amountMinor: row.amount_minor,
      currency: row.currency,
      status: row.status,
      destinationId: row.destination_id,
      requestedAt: row.requested_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      completedAt: row.completed_at,
      adminNotes: row.admin_notes,
    });
  }
  return rows;
}

export async function getLedgerEntriesForCreator(creatorId: string, limit = 20): Promise<LedgerEntry[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("creator_ledger_entries")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    entryType: row.entry_type,
    sourcePaymentId: row.source_payment_id,
    sourceConversationId: row.source_conversation_id,
    sourceSessionId: row.source_session_id,
    grossAmountMinor: row.gross_amount_minor,
    platformFeeMinor: row.platform_fee_minor,
    creatorNetMinor: row.creator_net_minor,
    currency: row.currency,
    commissionRateBps: row.commission_rate_bps,
    settlementStatus: row.settlement_status,
    payoutId: row.payout_id,
    reversesEntryId: row.reverses_entry_id,
    reference: row.reference,
    createdAt: row.created_at,
  }));
}

export async function approvePayout(payoutId: string, notes?: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("approve_payout", { p_payout_id: payoutId, p_notes: notes ?? null });
  if (error) throw error;
}

export async function rejectPayout(payoutId: string, reason: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("reject_payout", { p_payout_id: payoutId, p_reason: reason });
  if (error) throw error;
}

export async function markPayoutProcessing(payoutId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("mark_payout_processing", { p_payout_id: payoutId });
  if (error) throw error;
}

export async function markPayoutPaid(payoutId: string, notes?: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("mark_payout_paid", { p_payout_id: payoutId, p_notes: notes ?? null });
  if (error) throw error;
}
