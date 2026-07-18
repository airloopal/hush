import * as React from "react";
import Link from "next/link";
import { Camera, Video } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeShort, formatRemaining } from "@/lib/utils";
import { getMediaPurchasesForSession, getRemainingMs, isSessionActive } from "@/lib/chat";
import type { ChatMessage, ChatSession } from "@/lib/chat-types";

export interface ChatListItemProps {
  session: ChatSession;
  creatorAvatarUrl?: string;
  lastMessage?: ChatMessage;
  unread?: boolean;
}

export function ChatListItem({ session, creatorAvatarUrl, lastMessage, unread }: ChatListItemProps) {
  const active = isSessionActive(session);
  const pendingPhoto = getMediaPurchasesForSession(session.id).some(
    (p) => p.mediaType === "photo" && p.status === "requested"
  );
  const pendingVideo = getMediaPurchasesForSession(session.id).some(
    (p) => p.mediaType === "video" && p.status === "requested"
  );

  return (
    <Link
      href={`/chats/${session.creatorUsername}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors duration-fast ease-signal hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="relative inline-flex shrink-0">
        <Avatar src={creatorAvatarUrl} alt={session.creatorUsername} size="lg" online={active} />
        {unread && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald ring-2 ring-surface"
            aria-label="Unread messages"
          />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate leading-tight", unread ? "font-semibold" : "font-medium")}>
            @{session.creatorUsername}
          </span>
          <span
            className={cn(
              "font-mono-data shrink-0 text-xs",
              active ? "text-emerald" : "text-text-muted"
            )}
          >
            {active ? formatRemaining(getRemainingMs(session)) : "Expired"}
          </span>
        </div>
        <p className={cn("truncate text-sm", unread ? "text-text-primary" : "text-text-secondary")}>
          {lastMessage ? lastMessage.body : "No messages yet"}
        </p>
        <div className="flex items-center gap-2">
          {lastMessage && (
            <span className="text-[11px] text-text-muted">{formatRelativeShort(lastMessage.sentAt)}</span>
          )}
          {pendingPhoto && (
            <span
              className="flex items-center gap-0.5 text-[11px] text-amber"
              title="Pending live photo request"
              aria-label="Pending live photo request"
            >
              <Camera className="h-3 w-3" />
            </span>
          )}
          {pendingVideo && (
            <span
              className="flex items-center gap-0.5 text-[11px] text-amber"
              title="Pending live video request"
              aria-label="Pending live video request"
            >
              <Video className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      <Button size="sm" variant={active ? "outline" : "primary"} asChild className="shrink-0">
        <span>{active ? "Continue Chat" : "Renew"}</span>
      </Button>
    </Link>
  );
}
