export type MediaRequestType = "live_photo" | "live_video";
export type MediaRequestStatus =
  | "pending_payment"
  | "pending_creator"
  | "accepted"
  | "fulfilled"
  | "declined"
  | "expired"
  | "refund_required";

export interface MediaRequest {
  id: string;
  conversationId: string;
  fanId: string;
  fanUsername?: string;
  creatorId: string;
  requestType: MediaRequestType;
  amountMinor: number;
  currency: string;
  status: MediaRequestStatus;
  paymentAttemptId: string | null;
  hasMedia: boolean;
  requestedAt: string;
  respondedAt: string | null;
  fulfilledAt: string | null;
  expiresAt: string | null;
  declineReason: string | null;
}
