import {
  getAllMediaPurchases,
  getAllMessages,
  getAllSessions,
  getBlockedCreators,
  saveAllMediaPurchases,
  saveAllMessages,
  saveAllSessions,
  saveBlockedCreators,
} from "@/lib/chat-storage";
import { getLastReadAt, setLastReadNow } from "@/lib/conversation-reads";
import type {
  ChatMessage,
  ChatMessageType,
  ChatSession,
  ChatSessionStatus,
  MediaPurchase,
  MediaType,
  SenderRole,
} from "@/lib/chat-types";

const SESSION_LENGTH_MS = 24 * 60 * 60 * 1000;
export const MESSAGE_MAX_LENGTH = 1000;

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Mock payment reference only — not a real transaction id. */
function generateTransactionRef(): string {
  return `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Session status — always derived from expiresAt, never stored.
// ---------------------------------------------------------------------------

export function isSessionActive(session: ChatSession): boolean {
  return new Date(session.expiresAt).getTime() > Date.now();
}

export function getSessionStatus(session: ChatSession): ChatSessionStatus {
  return isSessionActive(session) ? "active" : "expired";
}

export function getRemainingMs(session: ChatSession): number {
  return Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
}

/** Single source of truth for the "expiring soon" threshold across the app. */
export const EXPIRING_SOON_MS = 6 * 60 * 60 * 1000;

export function isExpiringSoon(session: ChatSession): boolean {
  return isSessionActive(session) && getRemainingMs(session) < EXPIRING_SOON_MS;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isExpiringToday(session: ChatSession): boolean {
  return isSessionActive(session) && isSameCalendarDay(new Date(session.expiresAt), new Date());
}

/**
 * Conversation status badge for the creator/fan chat header and dashboard.
 * Derives from the same expiry helpers above — never a second source of
 * truth for whether a session is active.
 */
export function getConversationStatus(
  session: ChatSession,
  isBlocked: boolean
): "blocked" | "expired" | "expiring" | "live" {
  if (isBlocked) return "blocked";
  if (!isSessionActive(session)) return "expired";
  if (isExpiringSoon(session)) return "expiring";
  return "live";
}

// ---------------------------------------------------------------------------
// Session lookup
// ---------------------------------------------------------------------------

function sessionsBetween(fanUsername: string, creatorUsername: string): ChatSession[] {
  return getAllSessions().filter(
    (s) => s.fanUsername === fanUsername && s.creatorUsername === creatorUsername
  );
}

/** Every session (active or expired) this fan/creator pair has ever had. */
export function getSessionsBetween(fanUsername: string, creatorUsername: string): ChatSession[] {
  return sessionsBetween(fanUsername, creatorUsername);
}

/**
 * The full message thread for a fan/creator relationship across every
 * session they've had — expired sessions keep their history, and a
 * renewal continues the same visible conversation rather than starting a
 * blank thread.
 */
export function getMessagesForPair(fanUsername: string, creatorUsername: string): ChatMessage[] {
  const sessionIds = new Set(sessionsBetween(fanUsername, creatorUsername).map((s) => s.id));
  return getAllMessages()
    .filter((m) => sessionIds.has(m.sessionId))
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

export function findActiveSession(
  fanUsername: string,
  creatorUsername: string
): ChatSession | undefined {
  return sessionsBetween(fanUsername, creatorUsername).find(isSessionActive);
}

/** Most recent session between this fan/creator pair, active or expired. */
export function findLatestSession(
  fanUsername: string,
  creatorUsername: string
): ChatSession | undefined {
  const sessions = sessionsBetween(fanUsername, creatorUsername);
  if (sessions.length === 0) return undefined;
  return [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )[0];
}

export function getAllSessionsForFan(fanUsername: string): ChatSession[] {
  return getAllSessions().filter((s) => s.fanUsername === fanUsername);
}

export function getAllSessionsForCreator(creatorUsername: string): ChatSession[] {
  return getAllSessions().filter((s) => s.creatorUsername === creatorUsername);
}

// ---------------------------------------------------------------------------
// Unlocking / renewing a session
// ---------------------------------------------------------------------------

export interface UnlockChatParams {
  creatorId: string;
  creatorUsername: string;
  fanUsername: string;
  chatPrice: string;
}

/**
 * Returns the existing active session if one already exists (never creates
 * a duplicate active session for the same fan/creator pair). Otherwise
 * creates a fresh 24-hour session — including when the previous session for
 * this pair has expired, in which case the old session and its message
 * history are retained untouched alongside the new one.
 */
export function unlockChatSession(params: UnlockChatParams): ChatSession {
  const existingActive = findActiveSession(params.fanUsername, params.creatorUsername);
  if (existingActive) return existingActive;

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + SESSION_LENGTH_MS);

  const session: ChatSession = {
    id: generateId("session"),
    creatorId: params.creatorId,
    creatorUsername: params.creatorUsername,
    fanUsername: params.fanUsername,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    transactionRef: generateTransactionRef(),
    chatPrice: params.chatPrice,
  };

  saveAllSessions([...getAllSessions(), session]);
  addSystemMessage(session.id, "24-hour chat access unlocked.");
  return session;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export function getMessagesForSession(sessionId: string): ChatMessage[] {
  return getAllMessages()
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

export function addMessage(
  sessionId: string,
  senderRole: SenderRole,
  senderUsername: string,
  body: string,
  type: ChatMessageType = "text"
): ChatMessage {
  const message: ChatMessage = {
    id: generateId("msg"),
    sessionId,
    senderRole,
    senderUsername,
    body,
    sentAt: new Date().toISOString(),
    type,
  };
  saveAllMessages([...getAllMessages(), message]);
  return message;
}

export function addSystemMessage(sessionId: string, body: string): ChatMessage {
  return addMessage(sessionId, "system", "hush", body, "system");
}

export function getLastMessage(sessionId: string): ChatMessage | undefined {
  const messages = getMessagesForSession(sessionId);
  return messages[messages.length - 1];
}

// ---------------------------------------------------------------------------
// Media purchases
// ---------------------------------------------------------------------------

export function getMediaPurchasesForSession(sessionId: string): MediaPurchase[] {
  return getAllMediaPurchases().filter((p) => p.sessionId === sessionId);
}

export function createMediaPurchase(
  session: ChatSession,
  mediaType: MediaType,
  price: string
): MediaPurchase {
  const purchase: MediaPurchase = {
    id: generateId("media"),
    sessionId: session.id,
    creatorUsername: session.creatorUsername,
    fanUsername: session.fanUsername,
    mediaType,
    price,
    status: "requested",
    requestedAt: new Date().toISOString(),
  };
  saveAllMediaPurchases([...getAllMediaPurchases(), purchase]);
  addMessage(
    session.id,
    "system",
    "hush",
    mediaType === "photo" ? "Live photo requested." : "Live video requested.",
    "media-request"
  );
  return purchase;
}

export function getPendingMediaPurchasesForSession(sessionId: string): MediaPurchase[] {
  return getMediaPurchasesForSession(sessionId).filter((p) => p.status === "requested");
}

export function getPendingMediaPurchasesForCreator(creatorUsername: string): MediaPurchase[] {
  return getAllMediaPurchases().filter(
    (p) => p.creatorUsername === creatorUsername && p.status === "requested"
  );
}

function setMediaPurchaseStatus(
  purchaseId: string,
  status: MediaPurchase["status"]
): MediaPurchase | undefined {
  const all = getAllMediaPurchases();
  const index = all.findIndex((p) => p.id === purchaseId);
  if (index === -1) return undefined;
  const updated: MediaPurchase = { ...all[index], status };
  const next = [...all];
  next[index] = updated;
  saveAllMediaPurchases(next);
  return updated;
}

/** Prototype fulfillment only — no real upload. Adds a delivery system message. */
export function fulfillMediaPurchase(purchase: MediaPurchase): MediaPurchase | undefined {
  const updated = setMediaPurchaseStatus(purchase.id, "fulfilled");
  if (updated) {
    addMessage(
      purchase.sessionId,
      "system",
      "hush",
      purchase.mediaType === "photo"
        ? "Live photo marked as delivered. Prototype only — no real file was sent."
        : "Live video marked as delivered. Prototype only — no real file was sent.",
      "media-request"
    );
  }
  return updated;
}

export function dismissMediaPurchase(purchase: MediaPurchase): MediaPurchase | undefined {
  const updated = setMediaPurchaseStatus(purchase.id, "dismissed");
  if (updated) {
    addMessage(
      purchase.sessionId,
      "system",
      "hush",
      purchase.mediaType === "photo" ? "Live photo request dismissed." : "Live video request dismissed.",
      "media-request"
    );
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Earnings — local mock totals only, never a real ledger.
// ---------------------------------------------------------------------------

export interface SessionEarnings {
  chat: number;
  photo: number;
  video: number;
  total: number;
}

/** Chat + photo + video purchase total for a single session. All purchases
 * count toward earnings regardless of fulfillment status — the fan already
 * "paid" (mock) the moment the purchase was requested. */
export function getSessionEarnings(session: ChatSession): SessionEarnings {
  const purchases = getMediaPurchasesForSession(session.id);
  const chat = Number.parseFloat(session.chatPrice) || 0;
  const photo = purchases
    .filter((p) => p.mediaType === "photo")
    .reduce((sum, p) => sum + (Number.parseFloat(p.price) || 0), 0);
  const video = purchases
    .filter((p) => p.mediaType === "video")
    .reduce((sum, p) => sum + (Number.parseFloat(p.price) || 0), 0);
  return { chat, photo, video, total: chat + photo + video };
}

/** Sum of chat-unlock and media-purchase amounts for sessions/purchases
 * created today, for this creator's dashboard summary card. */
export function getTodaysEarningsForCreator(creatorUsername: string): number {
  const today = new Date();
  const sessions = getAllSessionsForCreator(creatorUsername).filter((s) =>
    isSameCalendarDay(new Date(s.startedAt), today)
  );
  const chatTotal = sessions.reduce((sum, s) => sum + (Number.parseFloat(s.chatPrice) || 0), 0);

  const purchases = getAllMediaPurchases().filter(
    (p) => p.creatorUsername === creatorUsername && isSameCalendarDay(new Date(p.requestedAt), today)
  );
  const mediaTotal = purchases.reduce((sum, p) => sum + (Number.parseFloat(p.price) || 0), 0);

  return chatTotal + mediaTotal;
}

// ---------------------------------------------------------------------------
// Blocking
// ---------------------------------------------------------------------------

export function isCreatorBlocked(creatorUsername: string): boolean {
  return getBlockedCreators().includes(creatorUsername);
}

export function blockCreator(creatorUsername: string): void {
  const current = getBlockedCreators();
  if (current.includes(creatorUsername)) return;
  saveBlockedCreators([...current, creatorUsername]);
}

// ---------------------------------------------------------------------------
// Unread state (fan side) — derived from the last creator message vs. the
// stored last-read timestamp. No unread boolean is ever persisted.
// ---------------------------------------------------------------------------

/**
 * A conversation is unread for the fan when the most recent message sent by
 * the *creator* is newer than the fan's last-read timestamp for this pair.
 * Fan-sent messages and system messages (unlock/renew/media-status notes)
 * never mark a conversation unread.
 */
export function isConversationUnreadForFan(fanUsername: string, creatorUsername: string): boolean {
  const messages = getMessagesForPair(fanUsername, creatorUsername);
  const lastCreatorMessage = [...messages].reverse().find((m) => m.senderRole === "creator");
  if (!lastCreatorMessage) return false;

  const lastReadAt = getLastReadAt(fanUsername, creatorUsername);
  if (!lastReadAt) return true;

  return new Date(lastCreatorMessage.sentAt).getTime() > new Date(lastReadAt).getTime();
}

/** Call when the fan opens a conversation — marks it read as of now. */
export function markConversationReadByFan(fanUsername: string, creatorUsername: string): void {
  setLastReadNow(fanUsername, creatorUsername);
}

function lastActivityTime(session: ChatSession): number {
  const last = getLastMessage(session.id);
  return new Date(last?.sentAt ?? session.startedAt).getTime();
}

/**
 * Fan chat list order: unread active conversations first, then active
 * conversations by most recent activity, then expired conversations by
 * most recent activity. Does not touch creator dashboard sorting.
 */
export function sortFanChatSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((a, b) => {
    const aActive = isSessionActive(a);
    const bActive = isSessionActive(b);
    if (aActive !== bActive) return aActive ? -1 : 1;

    if (aActive) {
      const aUnread = isConversationUnreadForFan(a.fanUsername, a.creatorUsername);
      const bUnread = isConversationUnreadForFan(b.fanUsername, b.creatorUsername);
      if (aUnread !== bUnread) return aUnread ? -1 : 1;
    }

    return lastActivityTime(b) - lastActivityTime(a);
  });
}
