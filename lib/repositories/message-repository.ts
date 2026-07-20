import type { ChatMessage } from "@/lib/chat-types";

/** Placeholder repository interface — Phase 2.1A foundation only. */
export interface MessageRepository {
  listForSession(sessionId: string): Promise<ChatMessage[]>;
  add(message: ChatMessage): Promise<void>;
}
