import { readStorage, writeStorage } from "@/lib/storage";
import type { ChatMessage, ChatSession, MediaPurchase } from "@/lib/chat-types";

export const CHAT_STORAGE_KEYS = {
  sessions: "hush:chat-sessions",
  messages: "hush:chat-messages",
  mediaPurchases: "hush:media-purchases",
  blockedCreators: "hush:blocked-creators",
} as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
}

// ---------------------------------------------------------------------------
// Runtime validation — localStorage is user-editable and can be malformed,
// truncated, or from an older schema. Every read is validated field-by-field
// and invalid entries are dropped rather than trusted or allowed to crash
// the app.
// ---------------------------------------------------------------------------

function isValidSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    isNonEmptyString(s.id) &&
    isNonEmptyString(s.creatorId) &&
    isNonEmptyString(s.creatorUsername) &&
    isNonEmptyString(s.fanUsername) &&
    isValidIsoDate(s.startedAt) &&
    isValidIsoDate(s.expiresAt) &&
    isNonEmptyString(s.transactionRef) &&
    isNonEmptyString(s.chatPrice)
  );
}

function isValidMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    isNonEmptyString(m.id) &&
    isNonEmptyString(m.sessionId) &&
    (m.senderRole === "fan" || m.senderRole === "creator" || m.senderRole === "system") &&
    isNonEmptyString(m.senderUsername) &&
    typeof m.body === "string" &&
    isValidIsoDate(m.sentAt) &&
    (m.type === "text" || m.type === "system" || m.type === "media-request")
  );
}

function isValidMediaPurchase(value: unknown): value is MediaPurchase {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    isNonEmptyString(p.id) &&
    isNonEmptyString(p.sessionId) &&
    isNonEmptyString(p.creatorUsername) &&
    isNonEmptyString(p.fanUsername) &&
    (p.mediaType === "photo" || p.mediaType === "video") &&
    isNonEmptyString(p.price) &&
    p.status === "requested" &&
    isValidIsoDate(p.requestedAt)
  );
}

function readValidatedList<T>(key: string, isValid: (value: unknown) => value is T): T[] {
  const raw = readStorage<unknown>(key);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValid);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function getAllSessions(): ChatSession[] {
  return readValidatedList(CHAT_STORAGE_KEYS.sessions, isValidSession);
}

export function saveAllSessions(sessions: ChatSession[]): void {
  writeStorage(CHAT_STORAGE_KEYS.sessions, sessions);
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export function getAllMessages(): ChatMessage[] {
  return readValidatedList(CHAT_STORAGE_KEYS.messages, isValidMessage);
}

export function saveAllMessages(messages: ChatMessage[]): void {
  writeStorage(CHAT_STORAGE_KEYS.messages, messages);
}

// ---------------------------------------------------------------------------
// Media purchases
// ---------------------------------------------------------------------------

export function getAllMediaPurchases(): MediaPurchase[] {
  return readValidatedList(CHAT_STORAGE_KEYS.mediaPurchases, isValidMediaPurchase);
}

export function saveAllMediaPurchases(purchases: MediaPurchase[]): void {
  writeStorage(CHAT_STORAGE_KEYS.mediaPurchases, purchases);
}

// ---------------------------------------------------------------------------
// Blocked creators — flat list of usernames the current local fan blocked.
// ---------------------------------------------------------------------------

export function getBlockedCreators(): string[] {
  const raw = readStorage<unknown>(CHAT_STORAGE_KEYS.blockedCreators);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isNonEmptyString);
}

export function saveBlockedCreators(usernames: string[]): void {
  writeStorage(CHAT_STORAGE_KEYS.blockedCreators, usernames);
}
