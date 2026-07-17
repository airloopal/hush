"use client";

import * as React from "react";
import { Camera, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dismissMediaPurchase, fulfillMediaPurchase } from "@/lib/chat";
import type { MediaPurchase } from "@/lib/chat-types";

export interface MediaRequestCardProps {
  purchase: MediaPurchase;
  onResolved: () => void;
}

/** Prototype fulfillment only — no real upload happens here. */
export function MediaRequestCard({ purchase, onResolved }: MediaRequestCardProps) {
  const Icon = purchase.mediaType === "photo" ? Camera : Video;
  const label = purchase.mediaType === "photo" ? "Pending Live Photo Request" : "Pending Live Video Request";

  return (
    <Card className="border-amber/30 bg-amber/5">
      <CardContent className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber/15 text-amber">
            <Icon className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-text-primary">{label}</span>
            <span className="font-mono-data text-xs text-text-muted">${purchase.price}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dismissMediaPurchase(purchase);
              onResolved();
            }}
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            onClick={() => {
              fulfillMediaPurchase(purchase);
              onResolved();
            }}
          >
            Mark Fulfilled
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
