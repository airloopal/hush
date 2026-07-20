"use client";

import * as React from "react";
import { Camera, Video } from "lucide-react";

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
import type { ChatSession, MediaType } from "@/lib/chat-types";
import { createMediaPurchase } from "@/lib/chat";

export interface BuyMediaModalProps {
  session: ChatSession;
  mediaType: MediaType;
  price: string;
  disabled?: boolean;
  onPurchased: () => void;
}

/** Confirmation modal for a live photo/video request — no gallery, nothing pre-uploaded. */
export function BuyMediaModal({ session, mediaType, price, disabled, onPurchased }: BuyMediaModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const Icon = mediaType === "photo" ? Camera : Video;
  const label = mediaType === "photo" ? "Buy Live Photo" : "Buy Live Video";

  function handleConfirm() {
    createMediaPurchase(session, mediaType, price);
    setOpen(false);
    toast({
      title: mediaType === "photo" ? "Live photo requested" : "Live video requested",
      description: `@${session.creatorUsername} will create and send this live, during your conversation.`,
      variant: "success",
    });
    onPurchased();
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{label}</ModalTitle>
          <ModalDescription>Request from @{session.creatorUsername}</ModalDescription>
        </ModalHeader>

        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <span className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-text-muted" />
            {mediaType === "photo" ? "Live photo" : "Live video"}
          </span>
          <span className="font-mono-data text-sm font-semibold">${price}</span>
        </div>

        <p className="text-sm text-text-secondary">
          This media is created and sent live during your active conversation — there&apos;s no
          gallery or pre-uploaded content.
        </p>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm purchase</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
