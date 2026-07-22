import type { PaymentStatus } from "@/lib/payment-types";

export interface CreateCheckoutParams {
  paymentAttemptId: string;
  amountMinor: number;
  currency: string;
  /** Shown on the provider's hosted checkout page where supported. */
  description: string;
  /** Where the provider should send the fan back to after checkout. */
  returnUrl: string;
  /** Idempotency key for the *provider's* API call — separate from, but
   * usually derived from, payment_attempts.client_idempotency_key. */
  idempotencyKey: string;
}

export interface CreateCheckoutResult {
  /** The URL to redirect the fan to. */
  checkoutUrl: string;
  /** The provider's own identifier for this checkout/payment link —
   * stored as payment_attempts.provider_reference. */
  providerReference: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  /** Present only when valid — the provider's own event id, used for
   * payment_attempts.provider_event_id deduplication. */
  eventId?: string;
}

export interface ParsedPaymentEvent {
  /** The provider's own event id — must match WebhookVerificationResult.eventId. */
  eventId: string;
  /** The provider_reference this event is about, so the handler can find
   * the matching payment_attempts row. */
  providerReference: string;
  /** Mapped into Hush's internal status vocabulary by this adapter — see
   * mapProviderStatus. Nothing outside the adapter ever sees the
   * provider's own status strings. */
  status: PaymentStatus;
  /** The provider's raw status string, kept only for
   * payment_attempts.provider_status (informational/support use, never
   * used for authorization decisions). */
  rawProviderStatus: string;
  failureReason?: string;
}

/**
 * The ONLY boundary in this codebase that should know anything
 * provider-specific — exact endpoint paths, header names, payload shapes,
 * signature algorithms, or status strings. Every other file (repository,
 * service, webhook route, UI) talks only in terms of this interface and
 * Hush's own internal PaymentStatus vocabulary.
 *
 * See lib/payments/providers/rampex-adapter.ts for why that specific
 * implementation is an intentionally incomplete placeholder in this
 * delivery, and docs/rampex-payments.md for the full explanation.
 */
export interface PaymentProviderAdapter {
  readonly providerName: string;
  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;
  /** Verifies a webhook request's authenticity. `rawBody` must be the
   * exact, unparsed request body — signature schemes typically sign the
   * raw bytes, not a re-serialized JSON object, so parsing before
   * verifying can make a valid signature appear invalid (or, worse,
   * enable exploiting a JSON canonicalization mismatch). */
  verifyWebhookSignature(rawBody: string, headers: Headers): WebhookVerificationResult;
  /** Parses an already-verified webhook body into Hush's internal shape.
   * Never call this on an unverified request. */
  parseWebhookEvent(rawBody: string): ParsedPaymentEvent;
}
