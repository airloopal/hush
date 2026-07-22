export type ConversationSessionStatus = "pending" | "active" | "expired" | "refunded";

export interface ConversationSummary {
  /** Demo mode: a synthetic id derived from the fan/creator pair (see
   * lib/repositories/demo/demo-conversation-engine.ts) — demo mode has no
   * separate conversation row, just a shared (fan, creator) key across
   * ChatSession records. Real mode: the actual conversations.id. */
  id: string;
  creatorId: string;
  creatorUsername: string;
  fanId: string;
  fanUsername: string;
  latestMessageAt: string | null;
  latestMessagePreview: string | null;
  createdAt: string;
}

export interface ConversationSessionSummary {
  id: string;
  conversationId: string;
  activatedAt: string;
  expiresAt: string;
  status: ConversationSessionStatus;
}
