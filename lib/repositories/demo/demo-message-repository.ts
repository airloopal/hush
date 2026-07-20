import { getMessagesForSession } from "@/lib/chat";
import { getAllMessages, saveAllMessages } from "@/lib/chat-storage";
import type { ChatMessage } from "@/lib/chat-types";
import type { MessageRepository } from "@/lib/repositories/message-repository";

export const demoMessageRepository: MessageRepository = {
  async listForSession(sessionId) {
    return getMessagesForSession(sessionId);
  },
  async add(message: ChatMessage) {
    saveAllMessages([...getAllMessages(), message]);
  },
};
