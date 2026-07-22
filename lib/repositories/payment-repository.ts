import type { PaymentAttempt, FanPaymentRecord, CreatorPaymentSummaryRecord } from "@/lib/payment-types";

export interface CreatePendingPaymentParams {
  fanId: string;
  creatorId: string;
  conversationId: string;
  clientIdempotencyKey: string;
}

export interface PaymentRepository {
  /** Idempotent on (fanId, clientIdempotencyKey) — a repeated call with
   * the same key returns the existing pending payment rather than
   * creating a second one (prevents duplicate checkout creation from
   * repeated clicks, §3). Amount is never accepted here — it's always
   * computed server-side by the database trigger (protect_payment_amount). */
  createPendingPayment(params: CreatePendingPaymentParams): Promise<PaymentAttempt>;
  getPayment(id: string): Promise<PaymentAttempt | null>;
  getFanPaymentHistory(fanId: string): Promise<FanPaymentRecord[]>;
  getCreatorPaymentSummary(creatorId: string): Promise<CreatorPaymentSummaryRecord[]>;
}
