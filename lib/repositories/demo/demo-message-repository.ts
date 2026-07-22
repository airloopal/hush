import { addMessage, findLatestSession, getMessagesForPair, isSessionActive } from "@/lib/chat";
import { getLastReadAt, setLastReadNow } from "@/lib/conversation-reads";
import { getAccount } from "@/lib/account";
import { MOCK_CREATORS } from "@/lib/creators";
import type { MessageRepository } from "@/lib/repositories/message-repository";
import type { MessageSummary } from "@/lib/message-types";
import type { ChatMessage } from "@/lib/chat-types";

/**
 * Demo mode's message system has existed since Stage 2 (lib/chat.ts) —
 * this adapts it to the new MessageRepository interface rather than
 * building a second, parallel store. Realtime delivery has no meaning
 * within a single local browser tab, so subscribeToMessages is backed by
 * a same-tab EventTarget: sending a message dispatches an event that any
 * subscribed listener (e.g. another open view of the same conversation)
 * receives immediately — this is genuinely how demo mode already behaved
 * before this sprint (a single React state update visible everywhere),
 * just expressed through the same interface real mode uses.
 */

const demoMessageBus = new EventTarget();

function toSummary(message: ChatMessage): MessageSummary {
  return {
    id: message.id,
    conversationId: `demo:${message.sessionId}`, // resolved to the real fan:creator id by the caller when needed
    senderId: message.senderUsername,
    senderUsername: message.senderUsername,
    body: message.body,
    messageType: "text",
    clientMessageId: null,
    createdAt: message.sentAt,
  };
}

function parseDemoConversationId(conversationId: string): { fanUsername: string; creatorUsername: string } | null {
  const parts = conversationId.split(":");
  if (parts.length !== 3 || parts[0] !== "demo") return null;
  return { fanUsername: parts[1], creatorUsername: parts[2] };
}

export const demoMessageRepository: MessageRepository = {
  async getMessages(conversationId, options) {
    const parsed = parseDemoConversationId(conversationId);
    if (!parsed) return [];
    let messages = getMessagesForPair(parsed.fanUsername, parsed.creatorUsername).map((m) => ({
      ...toSummary(m),
      conversationId,
    }));
    if (options?.cursor) {
      messages = messages.filter((m) => m.createdAt < options.cursor!);
    }
    if (options?.limit) {
      messages = messages.slice(-options.limit);
    }
    return messages;
  },

  async sendMessage(conversationId, body, clientMessageId) {
    void clientMessageId; // demo mode is single-user/local — no retry-dedup surface needed
    const parsed = parseDemoConversationId(conversationId);
    if (!parsed) throw new Error(`Invalid demo conversation id: ${conversationId}`);
    const account = getAccount();
    if (!account) throw new Error("Not signed in.");

    const session = findLatestSession(parsed.fanUsername, parsed.creatorUsername);
    if (!session || !isSessionActive(session)) {
      throw new Error("Chat access has expired for this conversation.");
    }

    const senderRole = account.role === "creator" ? "creator" : "fan";
    const message = addMessage(session.id, senderRole, account.username, body, "text");
    const summary = { ...toSummary(message), conversationId };
    demoMessageBus.dispatchEvent(new CustomEvent(conversationId, { detail: summary }));
    return summary;
  },

  subscribeToMessages(conversationId, callback) {
    const listener = (event: Event) => callback((event as CustomEvent<MessageSummary>).detail);
    demoMessageBus.addEventListener(conversationId, listener);
    return () => demoMessageBus.removeEventListener(conversationId, listener);
  },

  async markConversationRead(conversationId) {
    const parsed = parseDemoConversationId(conversationId);
    if (!parsed) return;
    setLastReadNow(parsed.fanUsername, parsed.creatorUsername);
  },

  async getUnreadCounts() {
    const account = getAccount();
    if (!account || account.role !== "fan") return [];
    return MOCK_CREATORS.filter((c) => getMessagesForPair(account.username, c.username).length > 0)
      .map((c) => {
        const conversationId = `demo:${account.username}:${c.username}`;
        const lastReadAt = getLastReadAt(account.username, c.username);
        const messages = getMessagesForPair(account.username, c.username);
        const count = messages.filter((m) => m.senderUsername === c.username && (!lastReadAt || m.sentAt > lastReadAt)).length;
        return { conversationId, count };
      })
      .filter((c) => c.count > 0);
  },

  async getLastReadState(conversationId) {
    const parsed = parseDemoConversationId(conversationId);
    if (!parsed) return null;
    const lastReadAt = getLastReadAt(parsed.fanUsername, parsed.creatorUsername);
    return lastReadAt ? { lastReadMessageId: null, lastReadAt } : null;
  },
};
