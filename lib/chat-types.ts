/**
 * Stage 2 chat + monetization models.
 *
 * Prototype notes (apply throughout this file and its consumers):
 * - Timestamps are generated client-side with `new Date().toISOString()`.
 *   A production build must use server timestamps so a fan can't extend
 *   their own access by changing their device clock.
 * - Prices stay as decimal strings (e.g. "19.00") for simple form/display
 *   binding. Production payments must use integer minor units (cents) for
 *   every stored/transmitted amount.
 * - "Active" vs "expired" is never stored as a boolean — it's always
 *   derived from `expiresAt` vs the current time so it can't drift out of
 *   sync with reality (see lib/chat.ts `isSessionActive`).
 */

export type ChatSessionStatus = "active" | "expired";

export interface ChatSession {
  id: string;
  creatorId: string;
  creatorUsername: string;
  fanUsername: string;
  /** ISO timestamp. */
  startedAt: string;
  /** ISO timestamp, exactly 24h after startedAt in this prototype. */
  expiresAt: string;
  /** Mock transaction reference, e.g. "TXN-AB12CD34". Not a real payment. */
  transactionRef: string;
  /** Decimal string — see file header note. */
  chatPrice: string;
}

export type SenderRole = "fan" | "creator" | "system";
export type ChatMessageType = "text" | "system" | "media-request";

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderRole: SenderRole;
  senderUsername: string;
  body: string;
  /** ISO timestamp. */
  sentAt: string;
  type: ChatMessageType;
}

export type MediaType = "photo" | "video";
export type MediaPurchaseStatus = "requested";

export interface MediaPurchase {
  id: string;
  sessionId: string;
  creatorUsername: string;
  fanUsername: string;
  mediaType: MediaType;
  /** Decimal string — see file header note. */
  price: string;
  status: MediaPurchaseStatus;
  /** ISO timestamp. */
  requestedAt: string;
}
