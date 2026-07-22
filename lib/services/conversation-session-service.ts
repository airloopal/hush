import type { ConversationSessionRepository } from "@/lib/repositories/conversation-session-repository";
import type { ConversationSessionSummary } from "@/lib/conversation-types";

const DEFAULT_SESSION_HOURS = 24;

/**
 * The single source of truth for conversation-session lifecycle math.
 * Works identically regardless of which repository (demo or Supabase)
 * backs it — neither UI code nor a future message endpoint should
 * recompute "is this active" or "how much time is left" itself; they
 * should always go through this service.
 */
export class ConversationSessionService {
  constructor(private readonly sessions: ConversationSessionRepository) {}

  /** First unlock for a conversation. */
  async activate(conversationId: string, durationHours: number = DEFAULT_SESSION_HOURS): Promise<ConversationSessionSummary> {
    return this.sessions.createSession(conversationId, durationHours);
  }

  /** A renewal is always a brand-new session row — see
   * lib/repositories/conversation-session-repository.ts. */
  async renew(conversationId: string, durationHours: number = DEFAULT_SESSION_HOURS): Promise<ConversationSessionSummary> {
    return this.sessions.renewSession(conversationId, durationHours);
  }

  async getActive(conversationId: string): Promise<ConversationSessionSummary | null> {
    return this.sessions.getActiveSession(conversationId);
  }

  /** Calculates when a session would expire, given an activation time —
   * pure, no I/O, used by both the repository layer and any UI that needs
   * to preview an expiry before committing a purchase. */
  calculateExpiry(activatedAt: Date, durationHours: number = DEFAULT_SESSION_HOURS): Date {
    return new Date(activatedAt.getTime() + durationHours * 60 * 60 * 1000);
  }

  /** The authoritative "is this session usable right now" check. Never
   * trusts the stored `status` alone — always re-checks `expiresAt`
   * against the current time too, since nothing guarantees the lazy sweep
   * (expireSessions) has run recently (see docs/conversation-engine.md). */
  isActive(session: ConversationSessionSummary | null | undefined): boolean {
    if (!session) return false;
    return session.status === "active" && new Date(session.expiresAt).getTime() > Date.now();
  }

  isExpired(session: ConversationSessionSummary | null | undefined): boolean {
    return !this.isActive(session);
  }

  /** Milliseconds remaining, or 0 if not active. */
  getRemainingMs(session: ConversationSessionSummary | null | undefined): number {
    if (!this.isActive(session) || !session) return 0;
    return Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
  }

  /** "23h 12m" style, matching the product's existing countdown format
   * (see components/countdown.tsx, which this intentionally mirrors so a
   * future refactor can share one implementation). */
  formatCountdown(remainingMs: number): string {
    const totalMinutes = Math.max(0, Math.floor(remainingMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  }
}

export function createConversationSessionService(sessions: ConversationSessionRepository): ConversationSessionService {
  return new ConversationSessionService(sessions);
}
