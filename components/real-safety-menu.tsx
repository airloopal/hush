"use client";

import * as React from "react";
import { Flag, ShieldAlert, UserX } from "lucide-react";

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
import { blockUser, unblockUser } from "@/lib/moderation/blocks-client";
import { ReportDialog } from "@/components/report-dialog";

export interface RealSafetyMenuProps {
  counterpartId: string;
  counterpartUsername: string;
  conversationId: string;
  viewerRole: "fan" | "creator";
  isBlocked: boolean;
  onBlockedChange: (blocked: boolean) => void;
}

/**
 * Sprint L11 — real-mode counterpart to components/safety-menu.tsx (which
 * is demo-only, keyed on ChatSession/usernames). This one operates on
 * real UUIDs and writes to the real user_blocks/moderation_reports
 * tables. Every action is re-enforced server-side regardless of what
 * this menu shows — see migration 20260701000036_blocking_and_reporting.sql.
 */
export function RealSafetyMenu({
  counterpartId,
  counterpartUsername,
  conversationId,
  viewerRole,
  isBlocked,
  onBlockedChange,
}: RealSafetyMenuProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function handleBlock() {
    setBusy(true);
    try {
      await blockUser(counterpartId);
      onBlockedChange(true);
      setConfirmBlockOpen(false);
      setOpen(false);
      toast({
        title: `@${counterpartUsername} blocked`,
        description: "They can no longer message you, request media, or start a new chat with you.",
        variant: "success",
      });
    } catch (error) {
      toast({ title: "Couldn't block", description: error instanceof Error ? error.message : undefined, variant: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function handleUnblock() {
    setBusy(true);
    try {
      await unblockUser(counterpartId);
      onBlockedChange(false);
      setOpen(false);
      toast({ title: `@${counterpartUsername} unblocked`, variant: "success" });
    } catch (error) {
      toast({ title: "Couldn't unblock", description: error instanceof Error ? error.message : undefined, variant: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal open={open} onOpenChange={setOpen}>
        <ModalTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Safety options">
            <ShieldAlert className="h-4 w-4" />
          </Button>
        </ModalTrigger>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Safety</ModalTitle>
            <ModalDescription>@{counterpartUsername}</ModalDescription>
          </ModalHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setOpen(false);
                setReportOpen(true);
              }}
            >
              <Flag className="h-4 w-4" />
              Report {viewerRole === "fan" ? "creator" : "fan"} / conversation
            </Button>
            {isBlocked ? (
              <Button variant="outline" className="justify-start" onClick={handleUnblock} disabled={busy}>
                <UserX className="h-4 w-4" />
                Unblock @{counterpartUsername}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="justify-start text-danger"
                onClick={() => {
                  setOpen(false);
                  setConfirmBlockOpen(true);
                }}
              >
                <UserX className="h-4 w-4" />
                Block @{counterpartUsername}
              </Button>
            )}
          </div>
        </ModalContent>
      </Modal>

      <Modal open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Block @{counterpartUsername}?</ModalTitle>
            <ModalDescription>
              They won&apos;t be able to message you, request paid media, or start a new chat with you. Your existing
              conversation history and payment records are kept. You can unblock at any time.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => setConfirmBlockOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleBlock} disabled={busy}>
              {busy ? "Blocking…" : "Block"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        context={{ kind: "conversation", label: "this conversation" }}
        counterpartUsername={counterpartUsername}
        viewerRole={viewerRole}
        reportedUserId={counterpartId}
        conversationId={conversationId}
      />
    </>
  );
}
