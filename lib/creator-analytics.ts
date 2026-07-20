import {
  getAllSessionsForCreator,
  getMediaPurchasesForSession,
  getMessagesForSession,
} from "@/lib/chat";

const DAY_MS = 24 * 60 * 60 * 1000;

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Count of messages this creator sent today, across every conversation. */
export function getMessagesSentToday(creatorUsername: string): number {
  const today = new Date();
  const sessions = getAllSessionsForCreator(creatorUsername);
  let count = 0;
  for (const session of sessions) {
    for (const message of getMessagesForSession(session.id)) {
      if (message.senderRole === "creator" && isSameCalendarDay(new Date(message.sentAt), today)) {
        count += 1;
      }
    }
  }
  return count;
}

/** Total live photo/video purchases ever requested of this creator, any status. */
export function getMediaSoldCount(creatorUsername: string): number {
  const sessions = getAllSessionsForCreator(creatorUsername);
  return sessions.reduce((sum, session) => sum + getMediaPurchasesForSession(session.id).length, 0);
}

/** Average minutes between a fan's message and this creator's next reply,
 * across every conversation with at least one reply. Returns null if there
 * isn't enough data yet. */
export function getAverageResponseMinutes(creatorUsername: string): number | null {
  const sessions = getAllSessionsForCreator(creatorUsername);
  const gaps: number[] = [];

  for (const session of sessions) {
    const messages = getMessagesForSession(session.id);
    for (let i = 0; i < messages.length - 1; i += 1) {
      if (messages[i].senderRole !== "fan") continue;
      for (let j = i + 1; j < messages.length; j += 1) {
        if (messages[j].senderRole === "creator") {
          const gapMs = new Date(messages[j].sentAt).getTime() - new Date(messages[i].sentAt).getTime();
          if (gapMs > 0) gaps.push(gapMs / 60000);
          break;
        }
      }
    }
  }

  if (gaps.length === 0) return null;
  return Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length);
}

/** Sum of chat-unlock + media-purchase earnings for sessions/purchases from
 * the last 7 days. */
export function getWeeklyEarnings(creatorUsername: string): number {
  const now = Date.now();
  const sessions = getAllSessionsForCreator(creatorUsername);
  let total = 0;

  for (const session of sessions) {
    if (now - new Date(session.startedAt).getTime() <= 7 * DAY_MS) {
      total += Number.parseFloat(session.chatPrice) || 0;
    }
    for (const purchase of getMediaPurchasesForSession(session.id)) {
      if (now - new Date(purchase.requestedAt).getTime() <= 7 * DAY_MS) {
        total += Number.parseFloat(purchase.price) || 0;
      }
    }
  }

  return total;
}

/** Share of fans who have unlocked more than one session with this
 * creator. Returns null if there isn't enough data yet. */
export function getFanReturnRate(creatorUsername: string): number | null {
  const sessions = getAllSessionsForCreator(creatorUsername);
  if (sessions.length === 0) return null;

  const sessionsPerFan = new Map<string, number>();
  for (const session of sessions) {
    sessionsPerFan.set(session.fanUsername, (sessionsPerFan.get(session.fanUsername) ?? 0) + 1);
  }

  const returningFans = [...sessionsPerFan.values()].filter((count) => count > 1).length;
  return returningFans / sessionsPerFan.size;
}

/** Average session length in hours, for sessions that have already ended. */
export function getAverageConversationLengthHours(creatorUsername: string): number | null {
  const sessions = getAllSessionsForCreator(creatorUsername).filter(
    (s) => new Date(s.expiresAt).getTime() <= Date.now()
  );
  if (sessions.length === 0) return null;
  const totalHours = sessions.reduce(
    (sum, s) => sum + (new Date(s.expiresAt).getTime() - new Date(s.startedAt).getTime()) / (60 * 60 * 1000),
    0
  );
  return Math.round(totalHours / sessions.length);
}
