import "server-only";
import type { PaymentRepository } from "@/lib/repositories/payment-repository";
import type { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { PaymentProviderAdapter } from "@/lib/payments/provider-adapter";
import type { PaymentAttempt } from "@/lib/payment-types";

export type CreateCheckoutDenialReason =
  | "unauthenticated"
  | "account-not-active"
  | "creator-not-found"
  | "creator-not-approved"
  | "blocked";

export interface CreateCheckoutResult {
  ok: boolean;
  reason?: CreateCheckoutDenialReason;
  checkoutUrl?: string;
  paymentId?: string;
  error?: unknown;
}

export interface CreateCheckoutRequest {
  fanId: string;
  fanAccountActive: boolean;
  creatorId: string | null;
  creatorApproved: boolean;
  /** True if either party has blocked the other (checked by the caller
   * via the is_blocked_pair() RPC — see app/api/payments/checkout/route.ts).
   * Checked explicitly here rather than relying only on
   * protect_conversation_creation's own block check, because a renewal
   * reuses an *existing* conversation (createConversation is get-or-create)
   * without a new INSERT ever firing that trigger. */
  isBlocked: boolean;
  clientIdempotencyKey: string;
  returnUrl: string;
}

/**
 * The single place a checkout is created (§3). Every fact this depends on
 * — whether the account is active, whether the creator exists and is
 * approved — is passed in as an already-verified boolean/id from the
 * caller (a Server Component/Route Handler that looked it up itself,
 * e.g. via lib/auth/current-user.ts and the creator repository), never
 * trusted from the request body. Price is never accepted here at all —
 * protect_payment_amount (database trigger) is the actual authority; this
 * service only ever reads back whatever amount the database assigned.
 *
 * Only reuses/creates the CONVERSATION (§4's "if conversation exists,
 * reuse it") — it deliberately does NOT activate a session here.
 * Sessions only activate after a verified payment event (§5), handled by
 * lib/payments/webhook-handler.ts calling ConversationSessionService
 * directly, never by this service.
 */
export class PaymentService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly conversations: ConversationRepository,
    private readonly adapter: PaymentProviderAdapter
  ) {}

  async createCheckout(request: CreateCheckoutRequest): Promise<CreateCheckoutResult> {
    if (!request.fanId) return { ok: false, reason: "unauthenticated" };
    if (!request.fanAccountActive) return { ok: false, reason: "account-not-active" };
    if (!request.creatorId) return { ok: false, reason: "creator-not-found" };
    if (!request.creatorApproved) return { ok: false, reason: "creator-not-approved" };
    if (request.isBlocked) return { ok: false, reason: "blocked" };

    try {
      const conversation = await this.conversations.createConversation(request.fanId, request.creatorId);

      const payment: PaymentAttempt = await this.payments.createPendingPayment({
        fanId: request.fanId,
        creatorId: request.creatorId,
        conversationId: conversation.id,
        clientIdempotencyKey: request.clientIdempotencyKey,
      });

      // Demo-mode payments resolve instantly to "paid" (see
      // demoPaymentRepository) — nothing to check out for; the caller
      // should treat this as already complete and activate a session
      // itself (mirroring the real webhook-driven path).
      if (payment.internalStatus === "paid") {
        return { ok: true, paymentId: payment.id };
      }

      const checkout = await this.adapter.createCheckout({
        paymentAttemptId: payment.id,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        description: "24-hour chat access",
        returnUrl: `${request.returnUrl}?payment=${payment.id}`,
        idempotencyKey: request.clientIdempotencyKey,
      });

      return { ok: true, checkoutUrl: checkout.checkoutUrl, paymentId: payment.id };
    } catch (error) {
      return { ok: false, error };
    }
  }
}

export function createPaymentService(
  payments: PaymentRepository,
  conversations: ConversationRepository,
  adapter: PaymentProviderAdapter
): PaymentService {
  return new PaymentService(payments, conversations, adapter);
}
