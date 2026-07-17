import * as React from "react";
import Link from "next/link";
import { Camera, Video } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeShort, formatRemaining } from "@/lib/utils";
import { getMediaPurchasesForSession, getRemainingMs } from "@/lib/chat";
import type { ChatMessage, ChatSession } from "@/lib/chat-types";

export interface DashboardConversationRowProps {
  session: ChatSession;
  lastMessage?: ChatMessage;
}

export function DashboardConversationRow({ session, lastMessage }: DashboardConversationRowProps) {
  const purchases = getMediaPurchasesForSession(session.id);
  const hasPhotoRequest = purchases.some((p) => p.mediaType === "photo");
  const hasVideoRequest = purchases.some((p) => p.mediaType === "video");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Avatar alt={session.fanUsername} size="md" />
        <div className="flex flex-col">
          <span className="font-semibold leading-tight">@{session.fanUsername}</span>
          <span className="text-xs text-text-secondary">
            {lastMessage ? `Last message ${formatRelativeShort(lastMessage.sentAt)}` : "No messages yet"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-text-muted">
          {hasPhotoRequest && <Camera className="h-4 w-4" aria-label="Live photo requested" />}
          {hasVideoRequest && <Video className="h-4 w-4" aria-label="Live video requested" />}
        </div>
        <span className={cn("font-mono-data text-xs", "text-emerald")}>
          {formatRemaining(getRemainingMs(session))}
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/chats/${session.fanUsername}`}>Open Chat</Link>
        </Button>
      </div>
    </div>
  );
}
