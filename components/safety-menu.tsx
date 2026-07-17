"use client";

import * as React from "react";
import { AlertTriangle, ChevronLeft, CreditCard, Flag, Hash, ShieldAlert, UserX } from "lucide-react";

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
import { blockCreator } from "@/lib/chat";
import type { ChatSession } from "@/lib/chat-types";

type View = "menu" | "report" | "block" | "payment" | "reference";

const REPORT_REASONS = [
  "Harassment or abusive language",
  "Impersonation",
  "Unexpected or inappropriate content",
  "Something else",
];

export interface SafetyMenuProps {
  session: ChatSession;
  onBlocked: () => void;
}

/** Prototype safety menu — local-only, no moderation backend. */
export function SafetyMenu({ session, onBlocked }: SafetyMenuProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<View>("menu");

  function close() {
    setOpen(false);
    setView("menu");
  }

  function handleReport(reason: string) {
    toast({
      title: "Report submitted",
      description: `Thanks — we've logged this conversation for review (${reason}).`,
      variant: "default",
    });
    close();
  }

  function handleBlock() {
    blockCreator(session.creatorUsername);
    onBlocked();
    toast({
      title: "Creator blocked",
      description: `@${session.creatorUsername} can no longer message you. This chat is now read-only.`,
      variant: "danger",
    });
    close();
  }

  return (
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
              <ModalDescription>Options for this conversation with @{session.creatorUsername}.</ModalDescription>
            </ModalHeader>
            <div className="flex flex-col gap-1">
              <SafetyMenuItem icon={Flag} label="Report conversation" onClick={() => setView("report")} />
              <SafetyMenuItem icon={UserX} label="Block creator" onClick={() => setView("block")} />
              <SafetyMenuItem icon={CreditCard} label="Payment issue" onClick={() => setView("payment")} />
              <SafetyMenuItem icon={Hash} label="Conversation reference" onClick={() => setView("reference")} />
            </div>
          </>
        )}

        {view === "report" && (
          <>
            <ModalHeader>
              <BackButton onClick={() => setView("menu")} />
              <ModalTitle>Report conversation</ModalTitle>
              <ModalDescription>Choose the reason that fits best.</ModalDescription>
            </ModalHeader>
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map((reason) => (
                <Button key={reason} variant="outline" onClick={() => handleReport(reason)}>
                  {reason}
                </Button>
              ))}
            </div>
          </>
        )}

        {view === "block" && (
          <>
            <ModalHeader>
              <BackButton onClick={() => setView("menu")} />
              <ModalTitle>Block @{session.creatorUsername}?</ModalTitle>
              <ModalDescription>
                You won't be able to send or receive messages in this conversation anymore. This
                only affects this browser.
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

        {view === "payment" && (
          <>
            <ModalHeader>
              <BackButton onClick={() => setView("menu")} />
              <ModalTitle>Payment issue</ModalTitle>
              <ModalDescription>
                This is a prototype — no real payments were made. In a production build, this
                would open a support flow tied to your transaction history.
              </ModalDescription>
            </ModalHeader>
            <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-text-secondary">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber" />
              Transaction reference: <span className="font-mono-data text-text-primary">{session.transactionRef}</span>
            </div>
          </>
        )}

        {view === "reference" && (
          <>
            <ModalHeader>
              <BackButton onClick={() => setView("menu")} />
              <ModalTitle>Conversation reference</ModalTitle>
              <ModalDescription>Share this if you contact support about this chat.</ModalDescription>
            </ModalHeader>
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Session ID</span>
                <span className="font-mono-data text-text-primary">{session.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Transaction ref</span>
                <span className="font-mono-data text-text-primary">{session.transactionRef}</span>
              </div>
            </div>
          </>
        )}
      </ModalContent>
    </Modal>
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
