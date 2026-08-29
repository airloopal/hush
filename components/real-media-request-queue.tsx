"use client";

import * as React from "react";
import { Camera, Loader2, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { formatMinorUnits } from "@/lib/money";
import {
  getPendingMediaRequestsForCreator,
  acceptMediaRequest,
  declineMediaRequest,
  fulfilMediaRequest,
} from "@/lib/media-requests/client";
import type { MediaRequest } from "@/lib/media-request-types";

/**
 * Real-mode creator queue for paid live photo/video requests (Sprint L9).
 * Only ever shows requests already verified paid (status pending_creator
 * or accepted — pending_payment requests never reach this list at all,
 * satisfying "only verified server-side payment confirmation may activate
 * a request").
 */
export function RealMediaRequestQueue() {
  const { toast } = useToast();
  const [requests, setRequests] = React.useState<MediaRequest[] | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const load = React.useCallback(() => {
    getPendingMediaRequestsForCreator()
      .then(setRequests)
      .catch(() => setRequests([]));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleAccept(id: string) {
    setBusyId(id);
    try {
      await acceptMediaRequest(id);
      toast({ title: "Request accepted", description: "You have 24 hours to fulfil it.", variant: "success" });
      load();
    } catch (error) {
      toast({ title: "Couldn't accept", description: error instanceof Error ? error.message : undefined, variant: "danger" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(id: string) {
    setBusyId(id);
    try {
      await declineMediaRequest(id, "Declined by creator");
      toast({ title: "Request declined", description: "The fan's payment will be refunded.", variant: "success" });
      load();
    } catch (error) {
      toast({ title: "Couldn't decline", description: error instanceof Error ? error.message : undefined, variant: "danger" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleFileSelected(id: string, file: File | undefined) {
    if (!file) return;
    setBusyId(id);
    try {
      await fulfilMediaRequest(id, file);
      toast({ title: "Delivered", description: "The fan can now view it.", variant: "success" });
      load();
    } catch (error) {
      toast({ title: "Couldn't fulfil", description: error instanceof Error ? error.message : undefined, variant: "danger" });
    } finally {
      setBusyId(null);
    }
  }

  if (requests === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title="No media requests"
        description="Live photo and video requests from fans will show up here for you to fulfil."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {requests.map((request) => {
        const Icon = request.requestType === "live_photo" ? Camera : Video;
        const accept =
          request.requestType === "live_photo"
            ? "image/jpeg,image/png,image/webp,image/heic"
            : "video/mp4,video/quicktime,video/webm";
        return (
          <Card key={request.id} className="border-amber/30 bg-amber/5">
            <CardContent className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber/15 text-amber">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-text-primary">
                    {request.requestType === "live_photo" ? "Live Photo" : "Live Video"} request
                  </span>
                  <span className="font-mono-data text-xs text-text-muted">
                    {formatMinorUnits(request.amountMinor, request.currency)} ·{" "}
                    {request.status === "accepted" ? "Accepted — awaiting delivery" : "Awaiting your response"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {request.status === "pending_creator" && (
                  <>
                    <Button variant="outline" size="sm" disabled={busyId === request.id} onClick={() => handleDecline(request.id)}>
                      Decline
                    </Button>
                    <Button size="sm" disabled={busyId === request.id} onClick={() => handleAccept(request.id)}>
                      Accept
                    </Button>
                  </>
                )}
                {request.status === "accepted" && (
                  <>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[request.id] = el;
                      }}
                      type="file"
                      accept={accept}
                      className="hidden"
                      onChange={(e) => handleFileSelected(request.id, e.target.files?.[0])}
                    />
                    <Button
                      size="sm"
                      disabled={busyId === request.id}
                      onClick={() => fileInputRefs.current[request.id]?.click()}
                    >
                      {busyId === request.id ? "Uploading…" : "Upload & fulfil"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
