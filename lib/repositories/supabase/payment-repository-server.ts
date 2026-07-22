import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentRepository, CreatePendingPaymentParams } from "@/lib/repositories/payment-repository";
import type { PaymentAttempt, FanPaymentRecord, CreatorPaymentSummaryRecord } from "@/lib/payment-types";
import type { Database } from "@/lib/supabase/database.types";

type PaymentRow = Database["public"]["Tables"]["payment_attempts"]["Row"];

function toPaymentAttempt(row: PaymentRow): PaymentAttempt {
  return {
    id: row.id,
    fanId: row.fan_id,
    creatorId: row.creator_id,
    conversationId: row.conversation_id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    productType: "chat_day_pass",
    internalStatus: row.internal_status,
    provider: row.provider,
    providerReference: row.provider_reference,
    providerStatus: row.provider_status,
    paidAt: row.paid_at,
    failureReason: row.failure_reason,
    activatedSessionId: row.activated_session_id,
    createdAt: row.created_at,
  };
}

export const supabasePaymentRepository: PaymentRepository = {
  async createPendingPayment(params: CreatePendingPaymentParams) {
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("fan_id", params.fanId)
      .eq("client_idempotency_key", params.clientIdempotencyKey)
      .maybeSingle();
    if (existing) return toPaymentAttempt(existing);

    const { data, error } = await supabase
      .from("payment_attempts")
      .insert({
        fan_id: params.fanId,
        creator_id: params.creatorId,
        conversation_id: params.conversationId,
        client_idempotency_key: params.clientIdempotencyKey,
        amount_minor: 0,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toPaymentAttempt(data);
  },

  async getPayment(id: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("payment_attempts").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toPaymentAttempt(data) : null;
  },

  async getFanPaymentHistory(fanId: string): Promise<FanPaymentRecord[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("fan_payment_history")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    void fanId; // the view is already scoped to auth.uid() = fan_id via RLS
    return (data ?? []).map((row) => ({
      id: row.id,
      creatorId: row.creator_id,
      conversationId: row.conversation_id,
      amountMinor: row.amount_minor,
      currency: row.currency,
      productType: "chat_day_pass",
      internalStatus: row.internal_status,
      providerReference: row.provider_reference,
      paidAt: row.paid_at,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
    }));
  },

  async getCreatorPaymentSummary(creatorId: string): Promise<CreatorPaymentSummaryRecord[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("creator_payment_summary")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    void creatorId; // the view is already scoped to auth.uid() = creator_id via RLS
    return (data ?? []).map((row) => ({
      id: row.id,
      fanId: row.fan_id,
      conversationId: row.conversation_id,
      amountMinor: row.amount_minor,
      currency: row.currency,
      productType: "chat_day_pass",
      internalStatus: row.internal_status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
    }));
  },
};
