/**
 * Trust & Safety models. Everything here is local-only prototype data —
 * nothing is submitted anywhere, and there is no moderation backend.
 */

export type ReportReason =
  | "spam"
  | "harassment"
  | "fraud"
  | "illegal-content"
  | "underage-concern"
  | "other";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "fraud", label: "Fraud" },
  { value: "illegal-content", label: "Illegal content" },
  { value: "underage-concern", label: "Underage concern" },
  { value: "other", label: "Other" },
];

export type ReportStatus = "open";

export interface Report {
  id: string;
  creatorUsername: string;
  fanUsername: string;
  conversationId: string;
  reason: ReportReason;
  notes?: string;
  createdAt: string;
  status: ReportStatus;
}

export type PaymentIssueType =
  | "media-not-received"
  | "incorrect-charge"
  | "chat-expired-unexpectedly"
  | "other";

export const PAYMENT_ISSUE_TYPES: { value: PaymentIssueType; label: string }[] = [
  { value: "media-not-received", label: "Live media not received" },
  { value: "incorrect-charge", label: "Incorrect charge" },
  { value: "chat-expired-unexpectedly", label: "Chat expired unexpectedly" },
  { value: "other", label: "Other" },
];

export type PaymentIssueStatus = "open";

export interface PaymentIssue {
  id: string;
  creatorUsername: string;
  fanUsername: string;
  conversationId: string;
  type: PaymentIssueType;
  createdAt: string;
  status: PaymentIssueStatus;
}

/** Extends the existing hush:blocked-creators list with a timestamp. */
export interface BlockedCreator {
  creatorUsername: string;
  /** ISO timestamp. */
  blockedAt: string;
}

/**
 * Internal-only signal for creators — never shown to fans. Every field is
 * derived on demand from existing chat/report/block data rather than
 * persisted separately, so it can never drift out of sync with the data it
 * summarizes (same principle as session-expiry derivation elsewhere).
 */
export interface CreatorTrustMetrics {
  reportsReceived: number;
  blocksReceived: number;
  conversationsCompleted: number;
  mediaRequestsCompleted: number;
  /** 0–1. Share of this creator's conversations with at least one reply. */
  responseRate: number;
}
