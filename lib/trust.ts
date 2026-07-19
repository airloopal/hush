import { getAllPaymentIssues, getAllReports, saveAllPaymentIssues, saveAllReports } from "@/lib/trust-storage";
import { generateId } from "@/lib/id";
import {
  getAllSessionsForCreator,
  getMediaPurchasesForSession,
  getMessagesForSession,
  isCreatorBlocked,
  isSessionActive,
} from "@/lib/chat";
import type { CreatorTrustMetrics, PaymentIssue, PaymentIssueType, Report, ReportReason } from "@/lib/trust-types";

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface CreateReportParams {
  creatorUsername: string;
  fanUsername: string;
  conversationId: string;
  reason: ReportReason;
  notes?: string;
}

/** Local-only — nothing is submitted anywhere. */
export function createReport(params: CreateReportParams): Report {
  const report: Report = {
    id: generateId("report"),
    creatorUsername: params.creatorUsername,
    fanUsername: params.fanUsername,
    conversationId: params.conversationId,
    reason: params.reason,
    notes: params.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
    status: "open",
  };
  saveAllReports([...getAllReports(), report]);
  return report;
}

export function getReportsForFan(fanUsername: string): Report[] {
  return getAllReports().filter((r) => r.fanUsername === fanUsername);
}

export function getReportsForCreator(creatorUsername: string): Report[] {
  return getAllReports().filter((r) => r.creatorUsername === creatorUsername);
}

// ---------------------------------------------------------------------------
// Payment issues
// ---------------------------------------------------------------------------

export interface CreatePaymentIssueParams {
  creatorUsername: string;
  fanUsername: string;
  conversationId: string;
  type: PaymentIssueType;
}

export function createPaymentIssue(params: CreatePaymentIssueParams): PaymentIssue {
  const issue: PaymentIssue = {
    id: generateId("issue"),
    creatorUsername: params.creatorUsername,
    fanUsername: params.fanUsername,
    conversationId: params.conversationId,
    type: params.type,
    createdAt: new Date().toISOString(),
    status: "open",
  };
  saveAllPaymentIssues([...getAllPaymentIssues(), issue]);
  return issue;
}

export function getPaymentIssuesForFan(fanUsername: string): PaymentIssue[] {
  return getAllPaymentIssues().filter((p) => p.fanUsername === fanUsername);
}

export function getPaymentIssuesForCreator(creatorUsername: string): PaymentIssue[] {
  return getAllPaymentIssues().filter((p) => p.creatorUsername === creatorUsername);
}

// ---------------------------------------------------------------------------
// Creator trust metrics — internal only, never shown to fans. Every value
// is derived on demand from existing session/report/block data rather than
// stored separately, so there's nothing here that can drift out of sync.
// ---------------------------------------------------------------------------

export function getCreatorTrustMetrics(creatorUsername: string): CreatorTrustMetrics {
  const sessions = getAllSessionsForCreator(creatorUsername);
  const completedSessions = sessions.filter((s) => !isSessionActive(s));

  const allPurchases = sessions.flatMap((s) => getMediaPurchasesForSession(s.id));
  const mediaRequestsCompleted = allPurchases.filter((p) => p.status === "fulfilled").length;

  const sessionsWithReply = sessions.filter((s) =>
    getMessagesForSession(s.id).some((m) => m.senderRole === "creator")
  ).length;
  const responseRate = sessions.length > 0 ? sessionsWithReply / sessions.length : 0;

  return {
    reportsReceived: getReportsForCreator(creatorUsername).length,
    // This prototype has no multi-user backend, so "blocks received" can
    // only reflect the current local fan's own block list.
    blocksReceived: isCreatorBlocked(creatorUsername) ? 1 : 0,
    conversationsCompleted: completedSessions.length,
    mediaRequestsCompleted,
    responseRate,
  };
}
