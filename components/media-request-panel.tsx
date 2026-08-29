"use client";

import * as React from "react";
import { Camera, Loader2, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getMediaRequestsForConversation, requestMedia, getMediaSignedUrl } from "@/lib/media-requests/client";
import type { MediaRequest, MediaRequestType } from "@/lib/media-request-types";

const STATUS_LABEL: Record<MediaRequest["status"], string> = {
  pending_payment: "Awaiting payment",
  pending_creator: "Waiting on creator",
  accepted: "Accepted — being prepared",
  fulfilled: "Delivered",
  declined: "Declined",
  expired: "Expired",
  refund_required: "Declined/expired — refund pending",
};

const STATUS_TONE: Record<MediaRequest["status"], string> = {
  pending_payment: "text-text-muted",
  pending_creator: "text-amber",
  accepted: "text-amber",
  fulfilled: "text-emerald",
  declined: "text-danger",
  expired: "text-danger",
  refund_required: "text-danger",
};

/**
 * Sprint L9.1 — the fan-facing surface for the L9 live media request
 * system, additive to the chat page rather than part of its existing
 * (still demo-only) message thread. Reuses lib/media-requests/client.ts
 * unchanged; adds no new backend behavior.
 */
export function MediaRequestPanel({
  conversationId,
  sessionActive,
  photoPriceLabel,
  videoPriceLabel,
}: {
  conversationId: string;
  sessionActive: boolean;
  photoPriceLabel: string;
  videoPriceLabel: string;
}) {
  const { toast } = useToast();
  const [requests, setRequests] = React.useState<MediaRequest[]>([]);
  const [confirmType, setConfirmType] = React.useState<MediaRequestType | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const inFlightRef = React.useRef(false);

  const load = React.useCallback(() => {
    getMediaRequestsForConversation(conversationId)
      .then(setRequests)
      .catch(() => setRequests([]));
  }, [conversationId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm(type: MediaRequestType) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      const { checkoutUrl } = await requestMedia(conversationId, type);
      window.location.href = checkoutUrl;
    } catch (error) {
      toast({
        title: "Couldn't start this request",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "danger",
      });
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border p-3">
      {requests.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {requests.map((request) => (
            <MediaRequestStatusRow key={request.id} request={request} />
          ))}
        </div>
      )}

      {sessionActive && (
        <div className="flex flex-wrap gap-2">
          <RequestConfirmModal
            open={confirmType === "live_photo"}
            onOpenChange={(open) => setConfirmType(open ? "live_photo" : null)}
            label="Request Live Photo"
            priceLabel={photoPriceLabel}
            icon={Camera}
            submitting={submitting}
            onConfirm={() => handleConfirm("live_photo")}
          />
          <RequestConfirmModal
            open={confirmType === "live_video"}
            onOpenChange={(open) => setConfirmType(open ? "live_video" : null)}
            label="Request Live Video"
            priceLabel={videoPriceLabel}
            icon={Video}
            submitting={submitting}
            onConfirm={() => handleConfirm("live_video")}
          />
        </div>
      )}
    </div>
  );
}

function RequestConfirmModal({
  open,
  onOpenChange,
  label,
  priceLabel,
  icon: Icon,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  priceLabel: string;
  icon: typeof Camera;
  submitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalTrigger asChild>
        <Button variant="outline" size="sm">
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{label}</ModalTitle>
          <ModalDescription>You&apos;ll be redirected to secure checkout to confirm payment.</ModalDescription>
        </ModalHeader>
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <span className="text-sm text-text-secondary">Price</span>
          <span className="font-mono-data text-sm font-semibold">{priceLabel}</span>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? "Starting checkout…" : "Continue to checkout"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function MediaRequestStatusRow({ request }: { request: MediaRequest }) {
  const Icon = request.requestType === "live_photo" ? Camera : Video;
  const [mediaUrl, setMediaUrl] = React.useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = React.useState(false);

  async function handleView() {
    setLoadingUrl(true);
    try {
      setMediaUrl(await getMediaSignedUrl(request.id));
    } catch {
      setMediaUrl(null);
    } finally {
      setLoadingUrl(false);
    }
  }

  return (
    <Card className="bg-surface-muted/40">
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <span className="text-sm font-medium">
              {request.requestType === "live_photo" ? "Live Photo" : "Live Video"}
            </span>
          </div>
          <span className={`text-xs font-medium ${STATUS_TONE[request.status]}`}>{STATUS_LABEL[request.status]}</span>
        </div>
        {request.status === "fulfilled" && (
          <div className="flex flex-col gap-2">
            {!mediaUrl ? (
              <Button variant="outline" size="sm" className="w-fit" onClick={handleView} disabled={loadingUrl}>
                {loadingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                View {request.requestType === "live_photo" ? "photo" : "video"}
              </Button>
            ) : request.requestType === "live_photo" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl} alt="Delivered live photo" className="max-h-80 w-full rounded-md object-contain" />
            ) : (
              <video src={mediaUrl} controls className="max-h-80 w-full rounded-md" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
