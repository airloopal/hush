import "server-only";
import { createHash } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createConversationSessionService } from "@/lib/services/conversation-session-service";
import { supabaseConversationSessionRepository } from "@/lib/repositories/supabase/conversation-repository-server";
import { recordChatEarning } from "@/lib/payments/earnings-service";
import type { PaymentProviderAdapter } from "@/lib/payments/provider-adapter";
import type { Database } from "@/lib/supabase/database.types";

type PaymentUpdate = Database["public"]["Tables"]["payment_attempts"]["Update"];
type WebhookEventOutcome = Database["public"]["Tables"]["payment_webhook_events"]["Insert"]["outcome"];

export type WebhookOutcome =
  | { ok: true; result: "processed" | "already-processed" | "unrecognized-payment" }
  | { ok: false; reason: "invalid-signature" | "database-failure" };

/**
 * §4/§5/§12/§13. Uses the service-role client (createSupabaseAdminClient)
 * because a webhook call has no authenticated user session at all — this
 * is one of only two tightly-scoped places in the entire payments feature
 * that use it (the other being this same function's audit-log write). All
 * payment decisions happen here, server-side, driven entirely by the
 * verified webhook event — never by anything the browser claims.
 *
 * Every invocation is logged to payment_webhook_events (§12), regardless
 * of outcome — including a rejected signature or an unrecognized payment
 * — via logAuditEvent() below, before returning.
 */
export async function processPaymentWebhook(
  rawBody: string,
  headers: Headers,
  adapter: PaymentProviderAdapter
): Promise<WebhookOutcome> {
  const admin = createSupabaseAdminClient();
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  const headerNames = [...headers.keys()].sort().join(",");

  async function logAuditEvent(params: {
    signatureValid: boolean;
    outcome: WebhookEventOutcome;
    providerEventId?: string | null;
    paymentAttemptId?: string | null;
  }): Promise<void> {
    // Audit logging failures are swallowed (never allowed to change the
    // webhook's own response to the provider, and never allowed to throw
    // out of processPaymentWebhook) — logging is best-effort observability,
    // not part of the payment-correctness guarantees themselves.
    try {
      await admin.from("payment_webhook_events").insert({
        provider: adapter.providerName,
        signature_valid: params.signatureValid,
        provider_event_id: params.providerEventId ?? null,
        payment_attempt_id: params.paymentAttemptId ?? null,
        outcome: params.outcome,
        body_sha256: bodyHash,
        header_names: headerNames,
      });
    } catch {
      // best-effort — see comment above
    }
  }

  const verification = adapter.verifyWebhookSignature(rawBody, headers);
  if (!verification.valid) {
    await logAuditEvent({ signatureValid: false, outcome: "invalid-signature" });
    return { ok: false, reason: "invalid-signature" };
  }

  const event = adapter.parseWebhookEvent(rawBody);

  // Idempotent acknowledgment: if this exact provider event was already
  // recorded on a payment, this is a safe duplicate delivery — acknowledge
  // without reprocessing (the unique index on provider_event_id would
  // also catch a raw double-insert, but checking first avoids a noisy
  // constraint error path for the common "provider retried" case).
  const { data: alreadyProcessed } = await admin
    .from("payment_attempts")
    .select("id")
    .eq("provider_event_id", event.eventId)
    .maybeSingle();
  if (alreadyProcessed) {
    await logAuditEvent({
      signatureValid: true,
      outcome: "already-processed",
      providerEventId: event.eventId,
      paymentAttemptId: alreadyProcessed.id,
    });
    return { ok: true, result: "already-processed" };
  }

  const { data: payment, error: findError } = await admin
    .from("payment_attempts")
    .select("*")
    .eq("provider_reference", event.providerReference)
    .maybeSingle();
  if (findError) {
    await logAuditEvent({ signatureValid: true, outcome: "database-failure", providerEventId: event.eventId });
    return { ok: false, reason: "database-failure" };
  }
  if (!payment) {
    // Never trust a payment we have no record of — acknowledge (so the
    // provider stops retrying) but do nothing else. This can legitimately
    // happen for test/misconfigured events; it must never activate
    // anything.
    await logAuditEvent({ signatureValid: true, outcome: "unrecognized-payment", providerEventId: event.eventId });
    return { ok: true, result: "unrecognized-payment" };
  }

  // Only a verified "paid" event ever activates access (§4/§8: "do not
  // activate chat for pending, cancelled or failed payments" / "activate
  // ... ONLY after verified webhook confirmation").
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
  if (updateError) {
    await logAuditEvent({
      signatureValid: true,
      outcome: "database-failure",
      providerEventId: event.eventId,
      paymentAttemptId: payment.id,
    });
    return { ok: false, reason: "database-failure" };
  }

  if (event.status === "paid" && payment.product_type === "chat_day_pass" && !payment.activated_session_id) {
    const sessionService = createConversationSessionService(supabaseConversationSessionRepository);
    const session = await sessionService.activate(payment.conversation_id);
    // §11: protect_payment_single_activation (database trigger) guarantees
    // this can only ever succeed once per payment — a duplicate webhook
    // delivery that somehow bypassed the provider_event_id check above
    // would still be rejected here, not silently create a second session.
    await admin.from("payment_attempts").update({ activated_session_id: session.id }).eq("id", payment.id);

    // Sprint L8 — additive: record the creator's earning for this payment.
    // Idempotent on its own terms (source_payment_id is unique per
    // chat_earning entry) — does not alter anything about the existing
    // session-activation flow above.
    await recordChatEarning(admin, {
      paymentAttemptId: payment.id,
      creatorId: payment.creator_id,
      amountMinor: payment.amount_minor,
      currency: payment.currency,
      conversationId: payment.conversation_id,
    });
  }

  // Sprint L9: live photo/video requests. "Only verified server-side
  // payment confirmation may activate a request" — this is the only place
  // a media_requests row ever leaves 'pending_payment'. Idempotent: the
  // status check means a duplicate delivery of the same event (which
  // shouldn't even reach here given the provider_event_id check above,
  // but is checked again for defense in depth) can't double-transition or
  // double-record an earning.
  if (event.status === "paid" && (payment.product_type === "live_photo" || payment.product_type === "live_video")) {
    const { data: mediaRequest } = await admin
      .from("media_requests")
      .select("id, status")
      .eq("payment_attempt_id", payment.id)
      .maybeSingle();
    if (mediaRequest && mediaRequest.status === "pending_payment") {
      await admin.from("media_requests").update({ status: "pending_creator" }).eq("id", mediaRequest.id);
      // Reuses the exact same earnings-recording function as chat day
      // passes — commission math and idempotency don't differ by product.
      await recordChatEarning(admin, {
        paymentAttemptId: payment.id,
        creatorId: payment.creator_id,
        amountMinor: payment.amount_minor,
        currency: payment.currency,
        conversationId: payment.conversation_id,
      });
    }
  }

  await logAuditEvent({
    signatureValid: true,
    outcome: "processed",
    providerEventId: event.eventId,
    paymentAttemptId: payment.id,
  });
  return { ok: true, result: "processed" };
}
