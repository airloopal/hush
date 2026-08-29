"use client";

import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { submitReport } from "@/lib/moderation/reports-client";
import { REPORT_REASONS, type ReportReason } from "@/lib/trust-types";
import type { ModerationReportType } from "@/lib/supabase/database.types";

export type ReportContext =
  | { kind: "user"; label: string }
  | { kind: "conversation"; label: string }
  | { kind: "message"; label: string; messageId: string; messageSnippet: string }
  | { kind: "media_request"; label: string; paymentAttemptId: string };

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ReportContext;
  counterpartUsername: string;
  viewerRole: "fan" | "creator";
  reportedUserId: string;
  conversationId: string;
}

/**
 * Sprint L11 — the single report submission UI, reused for every
 * reportable thing (user/conversation, a message, a media request)
 * rather than building a separate flow per type. All of them write to
 * the same existing moderation_reports table (no new moderation
 * infrastructure) — only which columns get populated differs:
 * - user/conversation: reported_user_id/reported_creator_id + conversation_id
 * - message: same, plus the message id/snippet folded into `reason`
 *   text (moderation_reports has no message_id column, and adding one
 *   isn't necessary — conversation_id already lets a moderator open the
 *   right thread, and the quoted snippet identifies the specific message)
 * - media request: payment_attempt_id set directly (media_requests.payment_attempt_id
 *   is exactly this same id, so a moderator can join straight to it)
 */
export function ReportDialog({
  open,
  onOpenChange,
  context,
  counterpartUsername,
  viewerRole,
  reportedUserId,
  conversationId,
}: ReportDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = React.useState<ReportReason>(REPORT_REASONS[0].value);
  const [details, setDetails] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setReason(REPORT_REASONS[0].value);
      setDetails("");
    }
  }, [open]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const reasonLabel = REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;
      const contextNote =
        context.kind === "message"
          ? ` [Reported message: "${context.messageSnippet.slice(0, 140)}"]`
          : context.kind === "media_request"
            ? " [Reported a specific media request]"
            : "";
      const reportType: ModerationReportType = viewerRole === "fan" ? "creator_report" : "user_report";

      await submitReport({
        reportType,
        reason: `${reasonLabel}${details.trim() ? `: ${details.trim()}` : ""}${contextNote}`,
        reportedCreatorId: viewerRole === "fan" ? reportedUserId : undefined,
        reportedUserId: viewerRole === "creator" ? reportedUserId : undefined,
        conversationId,
        paymentAttemptId: context.kind === "media_request" ? context.paymentAttemptId : undefined,
      });

      toast({ title: "Report submitted", description: "Our moderation team will review this.", variant: "success" });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Couldn't submit report",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Report {context.label}</ModalTitle>
          <ModalDescription>Your report is confidential — @{counterpartUsername} won&apos;t be notified.</ModalDescription>
        </ModalHeader>
        <div className="flex flex-col gap-3">
          {context.kind === "message" && (
            <blockquote className="rounded-md border border-border bg-surface-muted/40 p-2 text-xs italic text-text-secondary">
              &ldquo;{context.messageSnippet.slice(0, 200)}&rdquo;
            </blockquote>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-reason" className="text-xs font-medium text-text-secondary">
              Reason
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-details" className="text-xs font-medium text-text-secondary">
              Additional details (optional)
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              rows={3}
              maxLength={500}
              className="resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
              placeholder="Anything else that would help our team review this"
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
