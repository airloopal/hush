import "server-only";
import type {
  PaymentProviderAdapter,
  CreateCheckoutParams,
  CreateCheckoutResult,
  WebhookVerificationResult,
  ParsedPaymentEvent,
} from "@/lib/payments/provider-adapter";

/**
 * ============================================================================
 * PLACEHOLDER ADAPTER — NOT WIRED TO A REAL PAYMENT PROVIDER.
 * ============================================================================
 *
 * This file intentionally does NOT call any real Rampex endpoint, does NOT
 * implement a specific signature-verification algorithm, and does NOT
 * assume any specific webhook header or payload shape. Every method below
 * throws until it's completed with details from your own verified,
 * authoritative source for whichever payment provider you actually
 * integrate — Rampex or otherwise.
 *
 * Why this is a placeholder rather than a working integration: while
 * preparing this sprint, a review of the specific "Rampex" service named
 * in the brief found it markets itself explicitly as a "No-KYB" payment
 * gateway "built for high-risk merchants" in "restricted verticals," with
 * "no chargeback holds" and instant, hard-to-reverse crypto payout. That
 * combination — skipping standard merchant vetting, targeting high-risk/
 * restricted categories, and removing chargeback recourse — is a pattern
 * commonly associated with facilitating fraud or money laundering rather
 * than legitimate commerce, independent of what Hush itself is. Building
 * and shipping a precise, working integration to that specific service
 * (exact endpoints, exact webhook signature scheme, exact payload fields)
 * is the part that provides real operational uplift toward using it, so
 * that step was deliberately not completed. See docs/rampex-payments.md
 * for the full explanation.
 *
 * Everything else in this sprint — the database schema, RLS, repository/
 * service architecture, server-side price authority, webhook idempotency
 * handling, session activation, UI, and this very adapter *interface*
 * (lib/payments/provider-adapter.ts) — is provider-agnostic and complete.
 * Implementing this file for any specific, reputable, compliant payment
 * processor (Stripe, Adyen, a card-present processor, etc.) using that
 * provider's own official, current documentation is the only remaining
 * step to go live, and touches no other file in this codebase.
 */
export const rampexAdapter: PaymentProviderAdapter = {
  providerName: "rampex",

  async createCheckout(_params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    throw new Error(
      "rampexAdapter.createCheckout is a placeholder — implement against your payment provider's " +
        "verified, current API documentation before use. See docs/rampex-payments.md."
    );
  },

  verifyWebhookSignature(_rawBody: string, _headers: Headers): WebhookVerificationResult {
    // Deliberately always invalid — a placeholder must never silently
    // "pass" webhook verification. See the file header comment.
    return { valid: false };
  },

  parseWebhookEvent(_rawBody: string): ParsedPaymentEvent {
    throw new Error(
      "rampexAdapter.parseWebhookEvent is a placeholder and should never be reached — " +
        "verifyWebhookSignature always returns invalid until this adapter is completed."
    );
  },
};
