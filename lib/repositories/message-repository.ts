import type { MessageSummary, UnreadCount, LastReadState } from "@/lib/message-types";

export interface GetMessagesOptions {
  /** Fetch messages older than this message's createdAt (cursor pagination). */
  cursor?: string;
  limit?: number;
}

/**
 * Redesigned in Launch Sprint L4 (was a Phase 2.1A placeholder keyed on
 * the demo-era ChatMessage shape). Both the demo and Supabase
 * implementations return MessageSummary (lib/message-types.ts).
 */
export interface MessageRepository {
  /** Oldest-to-newest within the returned page; cursor paginates
   * backwards (older) from the given message. */
  getMessages(conversationId: string, options?: GetMessagesOptions): Promise<MessageSummary[]>;
  /** clientMessageId makes retries idempotent — sending the same id twice
   * returns the original persisted message rather than creating a
   * duplicate (see the unique index on messages(sender_id,
   * client_message_id)). */
  sendMessage(conversationId: string, body: string, clientMessageId: string): Promise<MessageSummary>;
  /** Subscribes to new messages in one conversation. Returns an
   * unsubscribe function. Browser-only — the server-side repository
   * throws if called (there's no long-lived connection to subscribe on
   * in a server context). Demo mode simulates this with a same-tab event
   * bus (see lib/repositories/demo/demo-conversation-engine.ts). */
  subscribeToMessages(conversationId: string, callback: (message: MessageSummary) => void): () => void;
  markConversationRead(conversationId: string, messageId?: string): Promise<void>;
  getUnreadCounts(userId: string): Promise<UnreadCount[]>;
  getLastReadState(conversationId: string, userId: string): Promise<LastReadState | null>;
}
