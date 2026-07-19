import { getAllMediaPurchasesForFan, getAllSessionsForFan, isSessionActive } from "@/lib/chat";
import type { ChatSession, MediaPurchase } from "@/lib/chat-types";

export type PurchaseType = "chat" | "photo" | "video";

export interface PurchaseRecord {
  id: string;
  type: PurchaseType;
  creatorUsername: string;
  amount: number;
  transactionRef: string;
  date: string;
  status: string;
}

function toChatRecord(session: ChatSession): PurchaseRecord {
  return {
    id: session.id,
    type: "chat",
    creatorUsername: session.creatorUsername,
    amount: Number.parseFloat(session.chatPrice) || 0,
    transactionRef: session.transactionRef,
    date: session.startedAt,
    status: isSessionActive(session) ? "Active" : "Expired",
  };
}

function mediaStatusLabel(status: MediaPurchase["status"]): string {
  if (status === "fulfilled") return "Fulfilled";
  if (status === "dismissed") return "Dismissed";
  return "Requested";
}

function toMediaRecord(purchase: MediaPurchase, sessionById: Map<string, ChatSession>): PurchaseRecord {
  const parentSession = sessionById.get(purchase.sessionId);
  return {
    id: purchase.id,
    type: purchase.mediaType,
    creatorUsername: purchase.creatorUsername,
    amount: Number.parseFloat(purchase.price) || 0,
    // Media purchases don't carry their own transaction ref in this
    // prototype — they're billed under the parent chat session's ref.
    transactionRef: parentSession?.transactionRef ?? "—",
    date: purchase.requestedAt,
    status: mediaStatusLabel(purchase.status),
  };
}

export function getPurchaseHistoryForFan(fanUsername: string): PurchaseRecord[] {
  const sessions = getAllSessionsForFan(fanUsername);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const chatRecords = sessions.map(toChatRecord);
  const mediaRecords = getAllMediaPurchasesForFan(fanUsername).map((p) => toMediaRecord(p, sessionById));

  return [...chatRecords, ...mediaRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export interface PurchaseSummary {
  totalSpent: number;
  chats: number;
  photos: number;
  videos: number;
}

export function summarizePurchases(records: PurchaseRecord[]): PurchaseSummary {
  return {
    totalSpent: records.reduce((sum, r) => sum + r.amount, 0),
    chats: records.filter((r) => r.type === "chat").length,
    photos: records.filter((r) => r.type === "photo").length,
    videos: records.filter((r) => r.type === "video").length,
  };
}

export interface PurchaseMonthGroup {
  label: string;
  records: PurchaseRecord[];
}

/** Groups already-sorted (newest-first) records by calendar month. */
export function groupPurchasesByMonth(records: PurchaseRecord[]): PurchaseMonthGroup[] {
  const groups = new Map<string, PurchaseRecord[]>();

  for (const record of records) {
    const date = new Date(record.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(record);
    } else {
      groups.set(key, [record]);
    }
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, groupRecords]) => {
      const [year, month] = key.split("-").map(Number);
      const label = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      return { label, records: groupRecords };
    });
}
