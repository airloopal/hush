import type { ConversationSessionSummary } from "@/lib/conversation-types";

/**
 * New in Launch Sprint L3. Sessions are append-only — renewing always
 * creates a new row (createSession again), never mutates a previous one.
 * Both implementations (lib/repositories/demo/, lib/repositories/supabase/)
 * return ConversationSessionSummary.
 */
export interface ConversationSessionRepository {
  createSession(conversationId: string, durationHours?: number): Promise<ConversationSessionSummary>;
  /** The most recent session for a conversation, if it's currently active
   * (status='active' AND not yet past expires_at) — null otherwise, even
   * if older expired/refunded sessions exist. Sweeps stale sessions to
   * 'expired' first (see expireSessions). */
  getActiveSession(conversationId: string): Promise<ConversationSessionSummary | null>;
  /** Convenience wrapper: same as createSession — a renewal IS a new
   * session, kept as a distinctly-named method for call-site clarity. */
  renewSession(conversationId: string, durationHours?: number): Promise<ConversationSessionSummary>;
  /** Lazy sweep: any of this conversation's sessions still marked
   * pending/active but past their expires_at get flipped to 'expired'.
   * Safe and cheap to call opportunistically — see
   * docs/conversation-engine.md. */
  expireSessions(conversationId: string): Promise<void>;
  /** Milliseconds remaining on the conversation's active session, or 0 if
   * none is active. Prefer ConversationSessionService.getRemainingMs for
   * UI code — this is the raw repository primitive it's built on. */
  sessionRemaining(conversationId: string): Promise<number>;
}
