import { readStorage, writeStorage } from "@/lib/storage";

export const CONVERSATION_READS_KEY = "hush:conversation-reads";

export interface ConversationReadState {
  fanUsername: string;
  creatorUsername: string;
  /** ISO timestamp of when the fan last opened/read this conversation. */
  lastReadAt: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
}

function isValidReadState(value: unknown): value is ConversationReadState {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return isNonEmptyString(r.fanUsername) && isNonEmptyString(r.creatorUsername) && isValidIsoDate(r.lastReadAt);
}

function getAllReadStates(): ConversationReadState[] {
  const raw = readStorage<unknown>(CONVERSATION_READS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidReadState);
}

function saveAllReadStates(states: ConversationReadState[]): void {
  writeStorage(CONVERSATION_READS_KEY, states);
}

/** Undefined means this conversation has never been marked read. */
export function getLastReadAt(fanUsername: string, creatorUsername: string): string | undefined {
  return getAllReadStates().find(
    (r) => r.fanUsername === fanUsername && r.creatorUsername === creatorUsername
  )?.lastReadAt;
}

export function setLastReadNow(fanUsername: string, creatorUsername: string): void {
  const now = new Date().toISOString();
  const states = getAllReadStates();
  const index = states.findIndex(
    (r) => r.fanUsername === fanUsername && r.creatorUsername === creatorUsername
  );
  if (index === -1) {
    saveAllReadStates([...states, { fanUsername, creatorUsername, lastReadAt: now }]);
    return;
  }
  const next = [...states];
  next[index] = { ...next[index], lastReadAt: now };
  saveAllReadStates(next);
}
