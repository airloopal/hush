import type { ChatSession } from "@/lib/chat-types";

/** Placeholder repository interface — Phase 2.1A foundation only. */
export interface ConversationRepository {
  listForFan(fanUsername: string): Promise<ChatSession[]>;
  listForCreator(creatorUsername: string): Promise<ChatSession[]>;
  getById(sessionId: string): Promise<ChatSession | null>;
}
