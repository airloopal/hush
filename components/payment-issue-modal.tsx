"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

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
import { createPaymentIssue } from "@/lib/trust";
import { PAYMENT_ISSUE_TYPES, type PaymentIssueType } from "@/lib/trust-types";

export interface PaymentIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorUsername: string;
  fanUsername: string;
  conversationId: string;
  transactionRef: string;
  onSubmitted?: () => void;
}

type Step = "select" | "confirm";

/** Reusable local-only payment issue flow — no real payment system to
 * connect to yet, so this just logs the issue in this browser. */
export function PaymentIssueModal({
  open,
  onOpenChange,
  creatorUsername,
  fanUsername,
  conversationId,
  transactionRef,
  onSubmitted,
}: PaymentIssueModalProps) {
  const { toast } = useToast();
  const [step, setStep] = React.useState<Step>("select");
  const [type, setType] = React.useState<PaymentIssueType | null>(null);

  React.useEffect(() => {
    if (!open) {
      setStep("select");
      setType(null);
    }
  }, [open]);

  const selectedTypeLabel = PAYMENT_ISSUE_TYPES.find((t) => t.value === type)?.label;

  function handleSubmit() {
    if (!type) return;
    createPaymentIssue({ creatorUsername, fanUsername, conversationId, type });
    onOpenChange(false);
    toast({
      title: "Payment issue reported",
      description: "We've logged this for review, referencing this conversation's transaction.",
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
              <ModalTitle>Payment issue</ModalTitle>
              <ModalDescription>
                This is a prototype — no real payments were made. Choose what happened and we'll
                log it against this conversation.
              </ModalDescription>
            </ModalHeader>

            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Payment issue type</legend>
              {PAYMENT_ISSUE_TYPES.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm text-text-primary transition-colors duration-fast ease-signal has-[:checked]:border-emerald has-[:checked]:bg-emerald/5"
                >
                  <input
                    type="radio"
                    name="payment-issue-type"
                    value={value}
                    checked={type === value}
                    onChange={() => setType(value)}
                    className="h-4 w-4 border-border text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            <div className="flex items-center gap-2 rounded-md border border-border p-3 text-xs text-text-secondary">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
              Transaction reference: <span className="font-mono-data text-text-primary">{transactionRef}</span>
            </div>

            <ModalFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={!type}>
                Continue
              </Button>
            </ModalFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <ModalHeader>
              <ModalTitle>Report this payment issue?</ModalTitle>
              <ModalDescription>
                You're reporting <strong>{selectedTypeLabel}</strong> for your conversation with @
                {creatorUsername}.
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button onClick={handleSubmit}>Submit report</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
