"use client";

import * as React from "react";
import { Camera, MessageCircle, Video } from "lucide-react";

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
import { unlockChatSession } from "@/lib/chat";
import { isDemoMode } from "@/lib/auth/mode";
import type { ChatSession } from "@/lib/chat-types";

export interface UnlockChatModalProps {
  creatorId: string;
  creatorUsername: string;
  fanUsername: string;
  chatPrice: string;
  photoPrice: string;
  videoPrice: string;
  /** "new" shows "Unlock Chat" copy, "renew" shows renewal copy. */
  mode: "new" | "renew";
  triggerLabel: string;
  /** Disable the trigger entirely — e.g. the fan has blocked this creator. */
  disabled?: boolean;
  onUnlocked: (session: ChatSession) => void;
}

/** Confirmation modal for paying to start or renew a 24-hour chat session.
 * Demo mode: mock processing only, unchanged from before this sprint — no
 * card details are ever collected. Real mode: creates a real checkout
 * (§3) and redirects to hosted checkout; nothing about price or access is
 * ever decided client-side either way. */
export function UnlockChatModal({
  creatorId,
  creatorUsername,
  fanUsername,
  chatPrice,
  photoPrice,
  videoPrice,
  mode,
  triggerLabel,
  disabled,
  onUnlocked,
}: UnlockChatModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  // One stable key per checkout attempt (regenerated only when the modal
  // is reopened) — sent as the idempotency header so repeated clicks
  // while a request is already in flight, or a retried request after a
  // network blip, can never create two payment rows (§3, §6).
  const idempotencyKeyRef = React.useRef<string>(crypto.randomUUID());

  function handleOpenChange(next: boolean) {
    if (next) idempotencyKeyRef.current = crypto.randomUUID();
    setOpen(next);
  }

  function handleConfirm() {
    if (processing) return; // belt-and-suspenders alongside the disabled button below
    if (isDemoMode()) {
      handleDemoConfirm();
    } else {
      void handleRealConfirm();
    }
  }

  function handleDemoConfirm() {
    setProcessing(true);
    // Mock processing delay only — no real payment call. Unchanged from
    // before this sprint.
    window.setTimeout(() => {
      const session = unlockChatSession({ creatorId, creatorUsername, fanUsername, chatPrice });
      setProcessing(false);
      setOpen(false);

      if (!session) {
        toast({
          title: "Chat unavailable",
          description: `You've blocked @${creatorUsername}. Unblock them from Settings to unlock chat access again.`,
          variant: "danger",
        });
        return;
      }

      toast(
        mode === "renew"
          ? {
              title: "Chat renewed",
              description: `Another 24 hours with @${creatorUsername} is now active.`,
              variant: "success",
            }
          : {
              title: "Chat unlocked",
              description: `24 hours of unlimited text with @${creatorUsername} is now active.`,
              variant: "success",
            }
      );
      onUnlocked(session);
    }, 400);
  }

  async function handleRealConfirm() {
    setProcessing(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-idempotency-key": idempotencyKeyRef.current },
        body: JSON.stringify({ creatorUsername }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Couldn't start checkout",
          description: data?.error ?? "Please try again in a moment.",
          variant: "danger",
        });
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // No checkoutUrl means the payment already resolved (e.g. an
      // already-paid idempotent retry) — send the fan straight to the
      // trusted return-page flow rather than assuming success locally.
      window.location.href = `/payments/return?payment=${data.paymentId}`;
    } catch {
      toast({
        title: "Couldn't start checkout",
        description: "Check your connection and try again.",
        variant: "danger",
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalTrigger asChild>
        <Button disabled={disabled}>{triggerLabel}</Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {mode === "renew" ? "Unlock another 24 hours" : "Confirm chat access"}
          </ModalTitle>
          <ModalDescription>
            {mode === "renew"
              ? `Renewing gives you another full 24 hours of unlimited text with @${creatorUsername}, starting now.`
              : `One-time purchase with @${creatorUsername} for 24 hours of unlimited text.`}{" "}
            This is a one-time purchase, not a subscription — access ends automatically after 24
            hours.
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col divide-y divide-border rounded-md border border-border">
          <div className="flex items-center justify-between p-3">
            <span className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4 text-text-muted" />
              24-hour access · unlimited text
            </span>
            <span className="font-mono-data text-sm font-semibold">${chatPrice}</span>
          </div>
          <div className="flex items-center justify-between p-3 text-text-muted">
            <span className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4" />
              Live photo (requested in chat)
            </span>
            <span className="font-mono-data text-sm">+${photoPrice}</span>
          </div>
          <div className="flex items-center justify-between p-3 text-text-muted">
            <span className="flex items-center gap-2 text-sm">
              <Video className="h-4 w-4" />
              Live video (requested in chat)
            </span>
            <span className="font-mono-data text-sm">+${videoPrice}</span>
          </div>
        </div>

        <p className="text-xs text-text-muted">
          {isDemoMode()
            ? "This is a prototype — no card details are collected and no real payment is made."
            : "You'll be redirected to secure hosted checkout. Hush never collects or stores your card details."}
        </p>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} isLoading={processing}>
            {mode === "renew" ? "Confirm and renew" : "Confirm and unlock"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
