import type {
  PaymentProviderAdapter,
  CreateCheckoutParams,
  CreateCheckoutResult,
  WebhookVerificationResult,
  ParsedPaymentEvent,
} from "@/lib/payments/provider-adapter";

/**
 * Used only in demo mode (Supabase not configured) and for local testing
 * of the checkout/webhook flow without a real provider connected. Mimics
 * a hosted-checkout provider by redirecting straight to Hush's own return
 * page with a status query param — this is exactly the kind of
 * unauthenticated redirect parameter §4/§7 say must never be trusted as
 * proof of payment, which is precisely why the return page always
 * re-fetches trusted state from the server rather than reading it.
 */
export const demoPaymentAdapter: PaymentProviderAdapter = {
  providerName: "demo",

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const providerReference = `demo_checkout_${params.paymentAttemptId}`;
    return {
      checkoutUrl: `${params.returnUrl}?demo_payment_attempt=${params.paymentAttemptId}`,
      providerReference,
    };
  },

  verifyWebhookSignature(): WebhookVerificationResult {
    // Demo mode never receives a real webhook — this exists only so the
    // interface is fully satisfied for tests/tooling that iterate over
    // every configured adapter.
    return { valid: true, eventId: `demo_evt_${Date.now()}` };
  },

  parseWebhookEvent(rawBody: string): ParsedPaymentEvent {
    const payload = JSON.parse(rawBody) as { paymentAttemptId: string };
    return {
      eventId: `demo_evt_${payload.paymentAttemptId}`,
      providerReference: `demo_checkout_${payload.paymentAttemptId}`,
      status: "paid",
      rawProviderStatus: "demo_paid",
    };
  },
};
