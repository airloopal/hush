import { getAllSessionsForFan, getAllSessionsForCreator } from "@/lib/chat";
import { getAllSessions } from "@/lib/chat-storage";
import type { ConversationRepository } from "@/lib/repositories/conversation-repository";

export const demoConversationRepository: ConversationRepository = {
  async listForFan(fanUsername) {
    return getAllSessionsForFan(fanUsername);
  },
  async listForCreator(creatorUsername) {
    return getAllSessionsForCreator(creatorUsername);
  },
  async getById(sessionId) {
    return getAllSessions().find((s) => s.id === sessionId) ?? null;
  },
};
