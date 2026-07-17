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
