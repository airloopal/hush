export type LedgerEntryType =
  | "chat_earning"
  | "platform_commission"
  | "refund"
  | "reversal"
  | "payout_deduction"
  | "manual_adjustment";

export type LedgerSettlementStatus = "pending" | "available";

export interface LedgerEntry {
  id: string;
  creatorId: string;
  entryType: LedgerEntryType;
  sourcePaymentId: string | null;
  sourceConversationId: string | null;
  sourceSessionId: string | null;
  grossAmountMinor: number;
  platformFeeMinor: number;
  creatorNetMinor: number;
  currency: string;
  commissionRateBps: number | null;
  settlementStatus: LedgerSettlementStatus;
  payoutId: string | null;
  reversesEntryId: string | null;
  reference: string | null;
  createdAt: string;
}

export interface CreatorBalance {
  creatorId: string;
  currency: string;
  pendingBalanceMinor: number;
  availableBalanceMinor: number;
  paidOutMinor: number;
  lifetimeGrossMinor: number;
  lifetimeCreatorEarningsMinor: number;
  lifetimePlatformFeesMinor: number;
}

export type PayoutRequestStatus = "pending" | "approved" | "processing" | "paid" | "rejected" | "cancelled";

export interface PayoutRequest {
  id: string;
  creatorId: string;
  amountMinor: number;
  currency: string;
  status: PayoutRequestStatus;
  destinationId: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  completedAt: string | null;
  adminNotes: string | null;
}

export interface PayoutDestination {
  id: string;
  creatorId: string;
  label: string;
  maskedReference: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CommissionResolution {
  rateBps: number;
  source: "creator_override" | "tier" | "global_default";
  tierName?: string;
}
