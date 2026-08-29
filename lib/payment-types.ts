export type PaymentProductType = "chat_day_pass" | "live_photo" | "live_video";

export type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "cancelled" | "expired";

export interface PaymentAttempt {
  id: string;
  fanId: string;
  creatorId: string;
  conversationId: string;
  amountMinor: number;
  currency: string;
  productType: PaymentProductType;
  internalStatus: PaymentStatus;
  provider: string;
  providerReference: string | null;
  providerStatus: string | null;
  paidAt: string | null;
  failureReason: string | null;
  activatedSessionId: string | null;
  createdAt: string;
}

/** What a fan sees in their purchase history — see the fan_payment_history view. */
export interface FanPaymentRecord {
  id: string;
  creatorId: string;
  creatorUsername?: string;
  conversationId: string;
  amountMinor: number;
  currency: string;
  productType: PaymentProductType;
  internalStatus: PaymentStatus;
  providerReference: string | null;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

/** What a creator sees for their own earnings context — see the
 * creator_payment_summary view. Deliberately narrower than FanPaymentRecord. */
export interface CreatorPaymentSummaryRecord {
  id: string;
  fanId: string;
  conversationId: string;
  amountMinor: number;
  currency: string;
  productType: PaymentProductType;
  internalStatus: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
}
