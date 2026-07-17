import * as React from "react";
import Link from "next/link";
import { Camera, Video } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn, formatRelativeShort, formatRemaining } from "@/lib/utils";
import {
  getConversationStatus,
  getMediaPurchasesForSession,
  getRemainingMs,
  getSessionEarnings,
} from "@/lib/chat";
import type { ChatMessage, ChatSession } from "@/lib/chat-types";

export interface DashboardConversationRowProps {
  session: ChatSession;
  lastMessage?: ChatMessage;
  /** True when the most recent message hasn't been replied to by this creator. */
  unread?: boolean;
}

export function DashboardConversationRow({ session, lastMessage, unread }: DashboardConversationRowProps) {
  const purchases = getMediaPurchasesForSession(session.id);
  const pendingPhoto = purchases.filter((p) => p.mediaType === "photo" && p.status === "requested").length;
  const pendingVideo = purchases.filter((p) => p.mediaType === "video" && p.status === "requested").length;
  const earnings = getSessionEarnings(session);
  const status = getConversationStatus(session, false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative inline-flex shrink-0">
          <Avatar alt={session.fanUsername} size="md" />
          {unread && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald ring-2 ring-surface"
              aria-label="Unread"
            />
          )}
        </span>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold leading-tight">@{session.fanUsername}</span>
            <StatusBadge status={status} />
          </div>
          <p className="truncate text-sm text-text-secondary">
            {lastMessage ? lastMessage.body : "No messages yet"}
          </p>
          <span className="text-xs text-text-muted">
            {lastMessage ? `Last activity ${formatRelativeShort(lastMessage.sentAt)}` : "No activity yet"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:justify-end">
        <div className="flex items-center gap-3 text-text-muted">
          {pendingPhoto > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber" title="Pending live photo request">
              <Camera className="h-3.5 w-3.5" />
              {pendingPhoto}
            </span>
          )}
          {pendingVideo > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber" title="Pending live video request">
              <Video className="h-3.5 w-3.5" />
              {pendingVideo}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end" title={`Chat $${earnings.chat.toFixed(2)} + Photo $${earnings.photo.toFixed(2)} + Video $${earnings.video.toFixed(2)}`}>
          <span className="font-mono-data text-sm font-semibold text-text-primary">
            ${earnings.total.toFixed(2)}
          </span>
          <span className="text-[11px] text-text-muted">total earned</span>
        </div>

        <span className={cn("font-mono-data text-xs", status === "expired" ? "text-text-muted" : "text-emerald")}>
          {formatRemaining(getRemainingMs(session))}
        </span>

        <Button variant="outline" size="sm" asChild>
          <Link href={`/chats/${session.fanUsername}`}>Open Chat</Link>
        </Button>
      </div>
    </div>
  );
}
