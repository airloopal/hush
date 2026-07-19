"use client";

import { Camera, Check } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Countdown } from "@/components/countdown";

// Purely decorative — a static preview of the product for the hero, not a
// real conversation. A fixed future date keeps the countdown display
// realistic without wiring any chat/session logic.
const MOCK_EXPIRES_AT = new Date(Date.now() + 19 * 60 * 60 * 1000 + 24 * 60 * 1000).toISOString();

export function LandingMockInterface() {
  return (
    <Card className="w-full max-w-md overflow-hidden border-border/80 bg-surface/95 shadow-lg backdrop-blur">
      <CardHeader className="flex-row items-center gap-3 border-b border-border">
        <Avatar alt="Ines Carvalho" size="md" online />
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-semibold leading-tight">@ines.carvalho</span>
          <span className="text-xs text-text-secondary">Active now</span>
        </div>
        <StatusBadge status="live" />
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-4">
        <div className="flex items-center justify-between rounded-md border border-border bg-surface-muted/60 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Access window
          </span>
          <Countdown target={MOCK_EXPIRES_AT} variant="compact" />
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-text-primary">
              Hey! Thanks for unlocking 24 hours 🎤
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-lg bg-emerald px-3.5 py-2.5 text-sm text-emerald-foreground">
              Of course — could I get a quick live photo?
            </div>
          </div>

          <div className="flex justify-center py-1">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/60 px-3 py-2">
              <Camera className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <span className="w-fit rounded-pill bg-coral/15 px-2 py-0.5 text-[10px] font-medium text-coral">
                  Live photo requested
                </span>
                <span className="text-xs text-text-secondary">$8.00 · sent during your chat</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-bg px-3 py-2.5 text-sm text-success">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15">
            <Check className="h-3 w-3" />
          </span>
          Payment confirmed — 24 hours unlocked for $19.00
        </div>
      </CardContent>
    </Card>
  );
}
