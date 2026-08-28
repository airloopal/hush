import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCommissionRate, calculateCommission } from "@/lib/payments/commission-service";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * Records a chat_earning ledger entry for a verified-paid payment.
 * Idempotent: if an entry already exists for this payment (the unique
 * index `creator_ledger_entries_one_earning_per_payment_idx`), this is a
 * safe no-op — matches §3's "processing the same payment/webhook twice
 * must never create duplicate earnings." Called from
 * lib/payments/webhook-handler.ts, additively, alongside (not replacing)
 * the existing session-activation call from Sprint L5.
 */
export async function recordChatEarning(
  admin: Client,
  params: { paymentAttemptId: string; creatorId: string; amountMinor: number; currency: string; conversationId: string }
): Promise<void> {
  const { data: existing } = await admin
    .from("creator_ledger_entries")
    .select("id")
    .eq("source_payment_id", params.paymentAttemptId)
    .eq("entry_type", "chat_earning")
    .maybeSingle();
  if (existing) return;

  const [{ data: creatorProfile }, { data: defaultSetting }] = await Promise.all([
    admin
      .from("creator_profiles")
      .select("commission_rate_bps, commission_tier_id, creator_commission_tiers(name, commission_bps)")
      .eq("user_id", params.creatorId)
      .maybeSingle(),
    admin.from("platform_settings").select("value").eq("key", "default_commission_bps").maybeSingle(),
  ]);

  const globalDefaultBps = typeof defaultSetting?.value === "number" ? defaultSetting.value : 2000;
  const tierRow = creatorProfile?.creator_commission_tiers as { name: string; commission_bps: number } | null | undefined;

  const resolution = resolveCommissionRate(
    {
      commissionRateBps: creatorProfile?.commission_rate_bps ?? null,
      tier: tierRow ? { name: tierRow.name, commissionBps: tierRow.commission_bps } : null,
    },
    globalDefaultBps
  );

  const commission = calculateCommission(params.amountMinor, resolution.rateBps);

  const { error } = await admin.from("creator_ledger_entries").insert({
    creator_id: params.creatorId,
    entry_type: "chat_earning",
    source_payment_id: params.paymentAttemptId,
    source_conversation_id: params.conversationId,
    gross_amount_minor: commission.grossAmountMinor,
    platform_fee_minor: commission.platformFeeMinor,
    creator_net_minor: commission.creatorNetMinor,
    currency: params.currency,
    commission_rate_bps: commission.commissionRateBps,
    reference: `Chat day pass — ${resolution.source}${resolution.tierName ? ` (${resolution.tierName})` : ""}`,
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}
