import { ConversationSessionService } from "@/lib/services/conversation-session-service";
import type { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { ConversationSessionRepository } from "@/lib/repositories/conversation-session-repository";
import type { ConversationSummary, ConversationSessionSummary } from "@/lib/conversation-types";

/**
 * Orchestrates conversation + session creation together — this is the
 * "when unlock succeeds (mock purchase)" entry point from Launch Sprint
 * L3 §4: reuse the existing conversation if one exists, otherwise create
 * it, then always create a fresh active session (an unlock or a renewal
 * are the same operation from this class's point of view — the
 * repository layer is what guarantees the previous session is never
 * overwritten).
 */
export class ConversationService {
  private readonly sessionService: ConversationSessionService;

  constructor(
    private readonly conversations: ConversationRepository,
    sessions: ConversationSessionRepository
  ) {
    this.sessionService = new ConversationSessionService(sessions);
  }

  async getConversationsForFan(fanId: string): Promise<ConversationSummary[]> {
    return this.conversations.getUserConversations(fanId, "fan");
  }

  async getConversationsForCreator(creatorId: string): Promise<ConversationSummary[]> {
    return this.conversations.getUserConversations(creatorId, "creator");
  }

  /** §4: unlock (or renew) access for a fan/creator pair. Mocked purchase
   * — no payment is actually processed here or anywhere in this sprint. */
  async unlock(
    fanId: string,
    creatorId: string,
    durationHours?: number
  ): Promise<{ conversation: ConversationSummary; session: ConversationSessionSummary }> {
    const conversation = await this.conversations.createConversation(fanId, creatorId);
    const existingActive = await this.sessionService.getActive(conversation.id);
    const session = existingActive ?? (await this.sessionService.activate(conversation.id, durationHours));
    return { conversation, session };
  }

  async renew(
    conversationId: string,
    durationHours?: number
  ): Promise<ConversationSessionSummary> {
    return this.sessionService.renew(conversationId, durationHours);
  }
}
