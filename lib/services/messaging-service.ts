import { ConversationSessionService } from "@/lib/services/conversation-session-service";
import type { MessageRepository } from "@/lib/repositories/message-repository";
import type { ConversationSessionRepository } from "@/lib/repositories/conversation-session-repository";
import type { MessageSummary } from "@/lib/message-types";

export const MAX_MESSAGE_LENGTH = 4000; // matches the messages_body_max_length CHECK constraint

export type SendMessageDenialReason = "empty-message" | "message-too-long" | "no-active-session";

export interface SendMessageResult {
  ok: boolean;
  message?: MessageSummary;
  reason?: SendMessageDenialReason;
  /** Set when the repository call itself failed (network/database/RLS
   * rejection) — always mapped through lib/auth/errors.ts-style
   * classification at the UI call site, never the raw Supabase error. */
  error?: unknown;
}

export function validateMessageBody(
  rawBody: string
): { valid: true; body: string } | { valid: false; reason: SendMessageDenialReason } {
  const body = rawBody.trim();
  if (body.length === 0) return { valid: false, reason: "empty-message" };
  if (body.length > MAX_MESSAGE_LENGTH) return { valid: false, reason: "message-too-long" };
  return { valid: true, body };
}

/**
 * The main authority for sending a message (Launch Sprint L4 §3). Trims/
 * validates the body, and — using the same ConversationSessionService
 * every other part of the app uses for this — pre-checks that there's an
 * active session before even attempting the network call, so a stale UI
 * fails fast with a clear reason instead of a raw server error.
 *
 * This pre-check is a UX optimization only. Participant / account-active /
 * creator-approved / session-active / rate-limit are all *re*-verified by
 * the database (protect_message_send trigger, see migration
 * 20260701000018_messages_reads_presence_tables.sql) regardless of what
 * this check finds — client-side state is never trusted as the actual
 * authorization boundary. That trigger is this app's equivalent of
 * canUserMessage() enforced at the point that actually matters (the
 * INSERT itself) rather than only in application code that a compromised
 * or buggy client could bypass.
 */
export class MessagingService {
  private readonly sessionService: ConversationSessionService;

  constructor(
    private readonly messages: MessageRepository,
    sessions: ConversationSessionRepository
  ) {
    this.sessionService = new ConversationSessionService(sessions);
  }

  async send(conversationId: string, rawBody: string, clientMessageId: string): Promise<SendMessageResult> {
    const validated = validateMessageBody(rawBody);
    if (!validated.valid) return { ok: false, reason: validated.reason };

    const activeSession = await this.sessionService.getActive(conversationId);
    if (!this.sessionService.isActive(activeSession)) {
      return { ok: false, reason: "no-active-session" };
    }

    try {
      const message = await this.messages.sendMessage(conversationId, validated.body, clientMessageId);
      return { ok: true, message };
    } catch (error) {
      return { ok: false, error };
    }
  }
}

export function createMessagingService(
  messages: MessageRepository,
  sessions: ConversationSessionRepository
): MessagingService {
  return new MessagingService(messages, sessions);
}
