import {
  getSessionsBetween,
  findActiveSession,
  findLatestSession,
  getLastMessage,
  unlockChatSession,
} from "@/lib/chat";
import { getAccount } from "@/lib/account";
import { MOCK_CREATORS } from "@/lib/creators";
import type { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { ConversationSessionRepository } from "@/lib/repositories/conversation-session-repository";
import type { ConversationSummary, ConversationSessionSummary } from "@/lib/conversation-types";
import type { ChatSession } from "@/lib/chat-types";

/**
 * Demo mode has no separate "conversation" row — a (fanUsername,
 * creatorUsername) pair IS the conversation, and every ChatSession record
 * for that pair (already preserved across renewals, never overwritten —
 * see lib/chat.ts unlockChatSession) is a "session" in the new model's
 * terms. This file adapts that existing shape rather than introducing a
 * second, parallel demo data store.
 *
 * Demo fanId/creatorId are usernames, not UUIDs — consistent with every
 * other demo repository in this codebase (see demo-creator-repository.ts).
 */

function conversationIdFor(fanUsername: string, creatorUsername: string): string {
  return `demo:${fanUsername}:${creatorUsername}`;
}

function parseConversationId(conversationId: string): { fanUsername: string; creatorUsername: string } | null {
  const parts = conversationId.split(":");
  if (parts.length !== 3 || parts[0] !== "demo") return null;
  return { fanUsername: parts[1], creatorUsername: parts[2] };
}

function toSummary(fanUsername: string, creatorUsername: string): ConversationSummary {
  const sessions = getSessionsBetween(fanUsername, creatorUsername);
  const latest = sessions[sessions.length - 1];
  const lastMessage = latest ? getLastMessage(latest.id) : undefined;
  const creator = MOCK_CREATORS.find((c) => c.username === creatorUsername);

  return {
    id: conversationIdFor(fanUsername, creatorUsername),
    creatorId: creator?.id ?? creatorUsername,
    creatorUsername,
    fanId: fanUsername,
    fanUsername,
    latestMessageAt: lastMessage?.sentAt ?? latest?.startedAt ?? null,
    latestMessagePreview: lastMessage?.body ?? null,
    createdAt: sessions[0]?.startedAt ?? new Date().toISOString(),
  };
}

function toSessionSummary(session: ChatSession): ConversationSessionSummary {
  const active = findActiveSession(session.fanUsername, session.creatorUsername)?.id === session.id;
  return {
    id: session.id,
    conversationId: conversationIdFor(session.fanUsername, session.creatorUsername),
    activatedAt: session.startedAt,
    expiresAt: session.expiresAt,
    status: active ? "active" : "expired",
  };
}

export const demoConversationRepository: ConversationRepository = {
  async createConversation(fanUsername, creatorUsername) {
    // Demo mode's actual unlock (with pricing/transactionRef/messages) goes
    // through unlockChatSession via UnlockChatModal, not here — this just
    // returns the get-or-create conversation summary the new interface
    // expects. Session creation is a separate call (see
    // demoConversationSessionRepository.createSession).
    return toSummary(fanUsername, creatorUsername);
  },
  async getConversation(conversationId) {
    const parsed = parseConversationId(conversationId);
    if (!parsed) return null;
    const sessions = getSessionsBetween(parsed.fanUsername, parsed.creatorUsername);
    if (sessions.length === 0) return null;
    return toSummary(parsed.fanUsername, parsed.creatorUsername);
  },
  async getConversationByUsers(fanUsername, creatorUsername) {
    const sessions = getSessionsBetween(fanUsername, creatorUsername);
    if (sessions.length === 0) return null;
    return toSummary(fanUsername, creatorUsername);
  },
  async getUserConversations(username, role) {
    const account = getAccount();
    if (!account) return [];
    if (role === "fan") {
      const creators = MOCK_CREATORS.filter((c) => getSessionsBetween(username, c.username).length > 0);
      return creators.map((c) => toSummary(username, c.username));
    }
    // Creator role: demo doesn't enumerate "every fan who ever messaged
    // this creator" separately from the existing dashboard's own session
    // list — out of scope to duplicate here, see docs/conversation-engine.md.
    return [];
  },
  async updateLatestMessage() {
    // No-op in demo mode: the demo message system (lib/chat.ts addMessage)
    // already updates what the chat list displays as "last message"
    // directly from the message store — there's no separate
    // latest_message_preview field to keep in sync.
  },
  async archiveConversation() {
    throw new Error("archiveConversation is not wired to any UI yet (Launch Sprint L3).");
  },
};

export const demoConversationSessionRepository: ConversationSessionRepository = {
  async createSession(conversationId) {
    const parsed = parseConversationId(conversationId);
    if (!parsed) throw new Error(`Invalid demo conversation id: ${conversationId}`);
    const creator = MOCK_CREATORS.find((c) => c.username === parsed.creatorUsername);
    if (!creator) throw new Error(`Unknown demo creator: ${parsed.creatorUsername}`);
    const session = unlockChatSession({
      fanUsername: parsed.fanUsername,
      creatorId: creator.id,
      creatorUsername: creator.username,
      chatPrice: creator.chatPrice,
    });
    if (!session) throw new Error("Could not create demo session (creator may be blocked).");
    return toSessionSummary(session);
  },
  async getActiveSession(conversationId) {
    const parsed = parseConversationId(conversationId);
    if (!parsed) return null;
    const active = findActiveSession(parsed.fanUsername, parsed.creatorUsername);
    return active ? toSessionSummary(active) : null;
  },
  async renewSession(conversationId) {
    return this.createSession(conversationId);
  },
  async expireSessions() {
    // No-op: demo "active" is always derived from expiresAt vs now() (see
    // lib/chat.ts isSessionActive) — there's no stored status to sweep.
  },
  async sessionRemaining(conversationId) {
    const parsed = parseConversationId(conversationId);
    if (!parsed) return 0;
    const active = findActiveSession(parsed.fanUsername, parsed.creatorUsername);
    if (!active) return 0;
    return Math.max(0, new Date(active.expiresAt).getTime() - Date.now());
  },
};

// Exported for pages that already have a ChatSession and just need the
// unified summary shape without a repository round-trip.
export function demoLatestSessionSummary(fanUsername: string, creatorUsername: string): ConversationSessionSummary | null {
  const latest = findLatestSession(fanUsername, creatorUsername);
  return latest ? toSessionSummary(latest) : null;
}
