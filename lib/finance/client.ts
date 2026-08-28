"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CreatorBalance, LedgerEntry, PayoutRequest, PayoutDestination } from "@/lib/finance-types";

/** All reads here are RLS-scoped to the caller's own rows (creator_id /
 * fan_id = auth.uid()) — see migrations 029-030. No server-only guard is
 * needed since nothing here can see or affect anyone else's finances. */

export async function getMyBalance(currency = "USD"): Promise<CreatorBalance | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("creator_balances").select("*").eq("currency", currency).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    creatorId: data.creator_id,
    currency: data.currency,
    pendingBalanceMinor: data.pending_balance_minor,
    availableBalanceMinor: data.available_balance_minor,
    paidOutMinor: data.paid_out_minor,
    lifetimeGrossMinor: data.lifetime_gross_minor,
    lifetimeCreatorEarningsMinor: data.lifetime_creator_earnings_minor,
    lifetimePlatformFeesMinor: data.lifetime_platform_fees_minor,
  };
}

export async function getMyLedgerEntries(limit = 30): Promise<LedgerEntry[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("creator_ledger_entries")
    .select("*")
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

export async function getMyPayoutRequests(): Promise<PayoutRequest[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("creator_payout_requests")
    .select("*")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    status: row.status,
    destinationId: row.destination_id,
    requestedAt: row.requested_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    completedAt: row.completed_at,
    adminNotes: row.admin_notes,
  }));
}

export async function getMyPayoutDestinations(): Promise<PayoutDestination[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("creator_payout_destinations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    label: row.label,
    maskedReference: row.masked_reference,
    isDefault: row.is_default,
    createdAt: row.created_at,
  }));
}

export async function addPayoutDestination(label: string, maskedReference?: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { error } = await supabase
    .from("creator_payout_destinations")
    .insert({ creator_id: user.id, label, masked_reference: maskedReference ?? null });
  if (error) throw error;
}

export async function getMinimumPayout(): Promise<{ amountMinor: number; currency: string }> {
  const supabase = createSupabaseBrowserClient();
  const [{ data: amountRow }, { data: currencyRow }] = await Promise.all([
    supabase.from("platform_settings").select("value").eq("key", "minimum_payout_minor").maybeSingle(),
    supabase.from("platform_settings").select("value").eq("key", "minimum_payout_currency").maybeSingle(),
  ]);
  const amountMinor = typeof amountRow?.value === "number" ? amountRow.value : 5000;
  const currency = typeof currencyRow?.value === "string" ? currencyRow.value : "USD";
  return { amountMinor, currency };
}

/** Wraps the request_payout RPC — all validation (minimum, balance,
 * concurrency) happens server-side in the database function itself; this
 * is just the typed call site. */
export async function requestPayout(amountMinor: number, currency: string, destinationId?: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("request_payout", {
    p_amount_minor: amountMinor,
    p_currency: currency,
    p_destination_id: destinationId ?? null,
  });
  if (error) throw error;
  return data;
}

export async function cancelPayoutRequest(payoutId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("cancel_payout_request", { p_payout_id: payoutId });
  if (error) throw error;
}
