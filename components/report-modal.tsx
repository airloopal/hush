"use client";

import * as React from "react";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { useToast } from "@/components/ui/use-toast";
import { createReport } from "@/lib/trust";
import { REPORT_REASONS, type ReportReason } from "@/lib/trust-types";

export interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorUsername: string;
  fanUsername: string;
  conversationId: string;
  onSubmitted?: () => void;
}

type Step = "select" | "confirm";

/** Reusable local-only report flow. Nothing is submitted anywhere — this
 * creates a Report record in this browser only. */
export function ReportModal({
  open,
  onOpenChange,
  creatorUsername,
  fanUsername,
  conversationId,
  onSubmitted,
}: ReportModalProps) {
  const { toast } = useToast();
  const [step, setStep] = React.useState<Step>("select");
  const [reason, setReason] = React.useState<ReportReason | null>(null);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setStep("select");
      setReason(null);
      setNotes("");
    }
  }, [open]);

  const selectedReasonLabel = REPORT_REASONS.find((r) => r.value === reason)?.label;

  function handleSubmit() {
    if (!reason) return;
    createReport({ creatorUsername, fanUsername, conversationId, reason, notes });
    onOpenChange(false);
    toast({
      title: "Report submitted",
      description: `Thanks — we've logged this conversation with @${creatorUsername} for review.`,
      variant: "success",
    });
    onSubmitted?.();
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        {step === "select" && (
          <>
            <ModalHeader>
              <ModalTitle>Report conversation</ModalTitle>
              <ModalDescription>
                Reporting @{creatorUsername} is local to this prototype and isn't sent anywhere.
                Choose the reason that fits best.
              </ModalDescription>
            </ModalHeader>

            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Report reason</legend>
              {REPORT_REASONS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm text-text-primary transition-colors duration-fast ease-signal has-[:checked]:border-emerald has-[:checked]:bg-emerald/5"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    className="h-4 w-4 border-border text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-notes" className="text-sm font-medium text-text-primary">
                Additional notes <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <textarea
                id="report-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value.slice(0, 500))}
                rows={3}
                maxLength={500}
                placeholder="Anything else that would help us understand what happened"
                className="flex w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors duration-fast ease-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>

            <ModalFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={!reason}>
                Continue
              </Button>
            </ModalFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <ModalHeader>
              <ModalTitle>Submit this report?</ModalTitle>
              <ModalDescription>
                You're reporting @{creatorUsername} for <strong>{selectedReasonLabel}</strong>. This
                is stored locally in this prototype for review.
              </ModalDescription>
            </ModalHeader>
            {notes && (
              <p className="rounded-md border border-border bg-surface-muted p-3 text-sm text-text-secondary">
                {notes}
              </p>
            )}
            <ModalFooter>
              <Button variant="ghost" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button onClick={handleSubmit}>
                <Flag className="h-4 w-4" />
                Submit report
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
