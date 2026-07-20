import { readStorage, writeStorage } from "@/lib/storage";
import type { PaymentIssue, Report } from "@/lib/trust-types";

export const TRUST_STORAGE_KEYS = {
  reports: "hush:reports",
  paymentIssues: "hush:payment-issues",
} as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
}

const REPORT_REASON_VALUES = ["spam", "harassment", "fraud", "illegal-content", "underage-concern", "other"];
const PAYMENT_ISSUE_TYPE_VALUES = [
  "media-not-received",
  "incorrect-charge",
  "chat-expired-unexpectedly",
  "other",
];

function isValidReport(value: unknown): value is Report {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    isNonEmptyString(r.id) &&
    isNonEmptyString(r.creatorUsername) &&
    isNonEmptyString(r.fanUsername) &&
    isNonEmptyString(r.conversationId) &&
    typeof r.reason === "string" &&
    REPORT_REASON_VALUES.includes(r.reason) &&
    (r.notes === undefined || typeof r.notes === "string") &&
    isValidIsoDate(r.createdAt) &&
    (r.status === "open" || r.status === "resolved" || r.status === "closed")
  );
}

function isValidPaymentIssue(value: unknown): value is PaymentIssue {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    isNonEmptyString(p.id) &&
    isNonEmptyString(p.creatorUsername) &&
    isNonEmptyString(p.fanUsername) &&
    isNonEmptyString(p.conversationId) &&
    typeof p.type === "string" &&
    PAYMENT_ISSUE_TYPE_VALUES.includes(p.type) &&
    isValidIsoDate(p.createdAt) &&
    (p.status === "open" || p.status === "pending-review" || p.status === "resolved")
  );
}

function readValidatedList<T>(key: string, isValid: (value: unknown) => value is T): T[] {
  const raw = readStorage<unknown>(key);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValid);
}

export function getAllReports(): Report[] {
  return readValidatedList(TRUST_STORAGE_KEYS.reports, isValidReport);
}

export function saveAllReports(reports: Report[]): void {
  writeStorage(TRUST_STORAGE_KEYS.reports, reports);
}

export function getAllPaymentIssues(): PaymentIssue[] {
  return readValidatedList(TRUST_STORAGE_KEYS.paymentIssues, isValidPaymentIssue);
}

export function saveAllPaymentIssues(issues: PaymentIssue[]): void {
  writeStorage(TRUST_STORAGE_KEYS.paymentIssues, issues);
}
