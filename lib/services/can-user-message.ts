import { ConversationSessionService } from "@/lib/services/conversation-session-service";
import type { ConversationSummary, ConversationSessionSummary } from "@/lib/conversation-types";
import type { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { ConversationSessionRepository } from "@/lib/repositories/conversation-session-repository";

export type CanUserMessageDenialReason =
  | "unauthenticated"
  | "not-participant"
  | "no-active-session"
  | "creator-not-approved"
  | "account-not-active";

export interface CanUserMessageResult {
  allowed: boolean;
  reason?: CanUserMessageDenialReason;
}

export interface CanUserMessageFacts {
  userId: string | null;
  conversation: ConversationSummary | null;
  activeSession: ConversationSessionSummary | null;
  creatorApproved: boolean;
  accountActive: boolean;
}

/**
 * §9's "central helper" — the single place that decides whether a given
 * user may send a message right now. Pure and synchronous over
 * pre-gathered facts, so it's fully unit-testable without a database;
 * `canUserMessage()` below is the async convenience wrapper that gathers
 * those facts for real call sites.
 *
 * There is no message-sending endpoint yet in this sprint ("do not
 * implement realtime messaging yet") — this exists so the endpoint that
 * eventually sends a message has an unambiguous, already-reviewed gate to
 * call before writing anything. Every future message endpoint must use
 * this helper rather than re-deriving these checks itself.
 */
export function evaluateCanUserMessage(facts: CanUserMessageFacts): CanUserMessageResult {
  if (!facts.userId) return { allowed: false, reason: "unauthenticated" };

  if (!facts.conversation) return { allowed: false, reason: "not-participant" };
  const isParticipant = facts.conversation.fanId === facts.userId || facts.conversation.creatorId === facts.userId;
  if (!isParticipant) return { allowed: false, reason: "not-participant" };

  if (!facts.accountActive) return { allowed: false, reason: "account-not-active" };
  if (!facts.creatorApproved) return { allowed: false, reason: "creator-not-approved" };

  const sessionService = new ConversationSessionService({
    // Only isActive() is used below — a real repository isn't needed for
    // this already-fetched session.
    createSession: async () => facts.activeSession as ConversationSessionSummary,
    getActiveSession: async () => facts.activeSession,
    renewSession: async () => facts.activeSession as ConversationSessionSummary,
    expireSessions: async () => undefined,
    sessionRemaining: async () => 0,
  } satisfies ConversationSessionRepository);

  if (!sessionService.isActive(facts.activeSession)) {
    return { allowed: false, reason: "no-active-session" };
  }

  return { allowed: true };
}

export interface CanUserMessageDeps {
  conversations: ConversationRepository;
  sessions: ConversationSessionRepository;
  /** Resolves whether the given creator (by their profile id) is
   * currently approved. Kept as an injected function rather than a full
   * repository dependency, since the two available CreatorRepository
   * lookups are username-keyed (public discovery) or owner-RLS-scoped
   * (self-service) — neither directly answers "is creator X approved"
   * for an arbitrary caller. A real message endpoint should implement
   * this with a privileged (service-role or SECURITY DEFINER) lookup,
   * the same pattern already used by is_admin(). */
  isCreatorApproved: (creatorId: string) => Promise<boolean>;
  /** Resolves whether the given user's account is active (not suspended/
   * banned/deleted). Same rationale as isCreatorApproved. */
  isAccountActive: (userId: string) => Promise<boolean>;
}

export async function canUserMessage(
  userId: string | null,
  conversationId: string,
  deps: CanUserMessageDeps
): Promise<CanUserMessageResult> {
  if (!userId) return { allowed: false, reason: "unauthenticated" };

  const conversation = await deps.conversations.getConversation(conversationId);
  if (!conversation || (conversation.fanId !== userId && conversation.creatorId !== userId)) {
    return { allowed: false, reason: "not-participant" };
  }

  const [activeSession, creatorApproved, accountActive] = await Promise.all([
    deps.sessions.getActiveSession(conversationId),
    deps.isCreatorApproved(conversation.creatorId),
    deps.isAccountActive(userId),
  ]);

  return evaluateCanUserMessage({ userId, conversation, activeSession, creatorApproved, accountActive });
}
