"use client";

import * as React from "react";
import { ChevronLeft, Copy, CreditCard, Flag, Hash, ShieldAlert, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { useToast } from "@/components/ui/use-toast";
import { ReportModal } from "@/components/report-modal";
import { PaymentIssueModal } from "@/components/payment-issue-modal";
import { blockCreator } from "@/lib/chat";
import type { ChatSession } from "@/lib/chat-types";

type View = "menu" | "block" | "reference";

export interface SafetyMenuProps {
  session: ChatSession;
  viewerRole: "fan" | "creator";
  onBlocked: () => void;
}

/** Prototype safety menu — local-only, no moderation backend. */
export function SafetyMenu({ session, viewerRole, onBlocked }: SafetyMenuProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<View>("menu");
  const [reportOpen, setReportOpen] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const counterpartUsername = viewerRole === "fan" ? session.creatorUsername : session.fanUsername;

  function close() {
    setOpen(false);
    setView("menu");
  }

  function openReport() {
    setOpen(false);
    setReportOpen(true);
  }

  function openPayment() {
    setOpen(false);
    setPaymentOpen(true);
  }

  function handleBlock() {
    if (viewerRole !== "fan") return;
    blockCreator(session.creatorUsername);
    onBlocked();
    toast({
      title: "Creator blocked",
      description: `@${session.creatorUsername} can no longer message you. This chat is now read-only. Manage blocked creators from Settings.`,
      variant: "danger",
    });
    close();
  }

  async function copyToClipboard(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Copied", description: `${label} copied to clipboard.`, variant: "success" });
    } catch {
      toast({ title: "Couldn't copy", description: "Copy this value manually instead.", variant: "danger" });
    }
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setView("menu");
        }}
      >
        <ModalTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Safety menu">
            <ShieldAlert className="h-4 w-4" />
          </Button>
        </ModalTrigger>
        <ModalContent>
          {view === "menu" && (
            <>
              <ModalHeader>
                <ModalTitle>Safety</ModalTitle>
                <ModalDescription>Options for this conversation with @{counterpartUsername}.</ModalDescription>
              </ModalHeader>
              <div className="flex flex-col gap-1">
                <SafetyMenuItem icon={Flag} label="Report conversation" onClick={openReport} />
                {viewerRole === "fan" && (
                  <SafetyMenuItem icon={UserX} label="Block creator" onClick={() => setView("block")} />
                )}
                <SafetyMenuItem icon={CreditCard} label="Payment issue" onClick={openPayment} />
                <SafetyMenuItem icon={Hash} label="Conversation reference" onClick={() => setView("reference")} />
              </div>
            </>
          )}

          {view === "block" && (
            <>
              <ModalHeader>
                <BackButton onClick={() => setView("menu")} />
                <ModalTitle>Block @{session.creatorUsername}?</ModalTitle>
                <ModalDescription>
                  You won't be able to send or receive messages in this conversation anymore, and
                  you won't be able to unlock a new chat with them until you unblock. This only
                  affects this browser and doesn't delete your message history.
                </ModalDescription>
              </ModalHeader>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setView("menu")}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleBlock}>
                  Block creator
                </Button>
              </ModalFooter>
            </>
          )}

          {view === "reference" && (
            <>
              <ModalHeader>
                <BackButton onClick={() => setView("menu")} />
                <ModalTitle>Conversation reference</ModalTitle>
                <ModalDescription>Share this if you contact support about this chat.</ModalDescription>
              </ModalHeader>
              <div className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
                <ReferenceRow label="Conversation ID" value={session.id} onCopy={copyToClipboard} />
                <ReferenceRow label="Transaction ref" value={session.transactionRef} onCopy={copyToClipboard} />
                <ReferenceRow
                  label="Unlocked"
                  value={new Date(session.startedAt).toLocaleString()}
                  onCopy={copyToClipboard}
                />
                <ReferenceRow
                  label="Expires"
                  value={new Date(session.expiresAt).toLocaleString()}
                  onCopy={copyToClipboard}
                />
              </div>
            </>
          )}
        </ModalContent>
      </Modal>

      <ReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        creatorUsername={session.creatorUsername}
        fanUsername={session.fanUsername}
        conversationId={session.id}
      />
      <PaymentIssueModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        creatorUsername={session.creatorUsername}
        fanUsername={session.fanUsername}
        conversationId={session.id}
        transactionRef={session.transactionRef}
      />
    </>
  );
}

function ReferenceRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="truncate font-mono-data text-text-primary">{value}</span>
      </div>
      <button
        type="button"
        onClick={() => onCopy(label, value)}
        aria-label={`Copy ${label}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-fast ease-signal hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

function SafetyMenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Flag;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-text-primary transition-colors duration-fast ease-signal hover:bg-surface-muted"
    >
      <Icon className="h-4 w-4 text-text-muted" />
      {label}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-1 inline-flex w-fit items-center gap-1 text-xs text-text-secondary transition-colors duration-fast ease-signal hover:text-text-primary"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      Back
    </button>
  );
}
