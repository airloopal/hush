import type { MessageRepository } from "@/lib/repositories/message-repository";
import type { ChatMessage } from "@/lib/chat-types";

/** Placeholder service boundary — Phase 2.1A foundation only. Future home
 * for message validation (trim/length limits) currently inline in
 * lib/chat.ts and components/chat-composer.tsx. Explicitly out of scope
 * here: real-time delivery (WebSockets) is not part of this phase. */
export class MessagingService {
  constructor(private readonly messages: MessageRepository) {}

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.messages.listForSession(sessionId);
  }

  async sendMessage(message: ChatMessage): Promise<void> {
    await this.messages.add(message);
  }
}
