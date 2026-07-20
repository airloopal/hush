import type { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { ChatSession } from "@/lib/chat-types";

/** Placeholder service boundary — Phase 2.1A foundation only. Future home
 * for unlock/renewal business rules currently in lib/chat.ts. */
export class ConversationService {
  constructor(private readonly conversations: ConversationRepository) {}

  async getConversationsForFan(fanUsername: string): Promise<ChatSession[]> {
    return this.conversations.listForFan(fanUsername);
  }

  async getConversationsForCreator(creatorUsername: string): Promise<ChatSession[]> {
    return this.conversations.listForCreator(creatorUsername);
  }
}
