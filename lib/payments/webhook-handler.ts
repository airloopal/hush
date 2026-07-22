import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createConversationSessionService } from "@/lib/services/conversation-session-service";
import { supabaseConversationSessionRepository } from "@/lib/repositories/supabase/conversation-repository-server";
import type { PaymentProviderAdapter } from "@/lib/payments/provider-adapter";
import type { Database } from "@/lib/supabase/database.types";

type PaymentUpdate = Database["public"]["Tables"]["payment_attempts"]["Update"];

export type WebhookOutcome =
  | { ok: true; result: "processed" | "already-processed" | "unrecognized-payment" }
  | { ok: false; reason: "invalid-signature" | "database-failure" };

/**
 * §4/§5. Uses the service-role client (createSupabaseAdminClient) because
 * a webhook call has no authenticated user session at all — this is the
 * one tightly-scoped place in the entire payments feature that touches
 * `payment_attempts.internal_status` outside of the database's own
 * triggers (§10: "service-role usage is tightly scoped").
 */
export async function processPaymentWebhook(
  rawBody: string,
  headers: Headers,
  adapter: PaymentProviderAdapter
): Promise<WebhookOutcome> {
  const verification = adapter.verifyWebhookSignature(rawBody, headers);
  if (!verification.valid) {
    return { ok: false, reason: "invalid-signature" };
  }

  const event = adapter.parseWebhookEvent(rawBody);
  const admin = createSupabaseAdminClient();

  // Idempotent acknowledgment: if this exact provider event was already
  // recorded, this is a safe duplicate delivery — acknowledge without
  // reprocessing (the unique index on provider_event_id would also catch
  // a raw double-insert, but checking first avoids a noisy constraint
  // error path for the common "provider retried" case).
  const { data: alreadyProcessed } = await admin
    .from("payment_attempts")
    .select("id")
    .eq("provider_event_id", event.eventId)
    .maybeSingle();
  if (alreadyProcessed) {
    return { ok: true, result: "already-processed" };
  }

  const { data: payment, error: findError } = await admin
    .from("payment_attempts")
    .select("*")
    .eq("provider_reference", event.providerReference)
    .maybeSingle();
  if (findError) return { ok: false, reason: "database-failure" };
  if (!payment) {
    // Never trust a payment we have no record of — acknowledge (so the
    // provider stops retrying) but do nothing else. This can legitimately
    // happen for test/misconfigured events; it must never activate
    // anything.
    return { ok: true, result: "unrecognized-payment" };
  }

  // Only a verified "paid" event ever activates access (§4: "do not
  // activate chat for pending, cancelled or failed payments").
  const updates: PaymentUpdate = {
    provider_status: event.rawProviderStatus,
    provider_event_id: event.eventId,
    internal_status: event.status,
  };
  if (event.status === "paid") {
    updates.paid_at = new Date().toISOString();
  }
  if (event.status === "failed" && event.failureReason) {
    updates.failure_reason = event.failureReason;
  }

  const { error: updateError } = await admin.from("payment_attempts").update(updates).eq("id", payment.id);
  if (updateError) return { ok: false, reason: "database-failure" };

  if (event.status === "paid" && !payment.activated_session_id) {
    const sessionService = createConversationSessionService(supabaseConversationSessionRepository);
    const session = await sessionService.activate(payment.conversation_id);
    // protect_payment_single_activation (database trigger) guarantees
    // this can only ever succeed once per payment — a duplicate webhook
    // delivery that somehow bypassed the provider_event_id check above
    // would still be rejected here.
    await admin.from("payment_attempts").update({ activated_session_id: session.id }).eq("id", payment.id);
  }

  return { ok: true, result: "processed" };
}
