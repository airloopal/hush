import type { ConversationSummary } from "@/lib/conversation-types";

/**
 * Redesigned in Launch Sprint L3 (was a Phase 2.1A placeholder keyed on
 * the demo-era ChatSession shape). Both the demo and Supabase
 * implementations return ConversationSummary (lib/conversation-types.ts)
 * so the chat list/active chat page render identically regardless of
 * which mode produced the data — same pattern as CreatorRepository /
 * DiscoverCreator (see docs/discover-data.md).
 */
export interface ConversationRepository {
  /** Get-or-create — reuses the existing conversation for this fan/creator
   * pair if one exists (§4: "If conversation exists: reuse it."). */
  createConversation(fanId: string, creatorId: string): Promise<ConversationSummary>;
  getConversation(conversationId: string): Promise<ConversationSummary | null>;
  getConversationByUsers(fanId: string, creatorId: string): Promise<ConversationSummary | null>;
  getUserConversations(userId: string, role: "fan" | "creator"): Promise<ConversationSummary[]>;
  updateLatestMessage(conversationId: string, preview: string, at?: string): Promise<void>;
  /** Fan-only visibility flag — never deletes data. No archived-state UI
   * exists yet in this sprint; the method exists so a future "hide this
   * conversation" action has somewhere to write to. */
  archiveConversation(conversationId: string, userId: string): Promise<void>;
}
