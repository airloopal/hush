import * as React from "react";
import Link from "next/link";
import { cn, formatRemaining } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import type { ChatMessage, ChatSession } from "@/lib/chat-types";
import { getRemainingMs, isSessionActive } from "@/lib/chat";

export interface ChatListItemProps {
  session: ChatSession;
  creatorAvatarUrl?: string;
  lastMessage?: ChatMessage;
  unread?: boolean;
}

export function ChatListItem({ session, creatorAvatarUrl, lastMessage, unread }: ChatListItemProps) {
  const active = isSessionActive(session);

  return (
    <Link
      href={`/chats/${session.creatorUsername}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors duration-fast ease-signal hover:bg-surface-muted"
    >
      <Avatar src={creatorAvatarUrl} alt={session.creatorUsername} size="lg" online={active} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold leading-tight">@{session.creatorUsername}</span>
          <span
            className={cn(
              "font-mono-data shrink-0 text-xs",
              active ? "text-emerald" : "text-text-muted"
            )}
          >
            {active ? formatRemaining(getRemainingMs(session)) : "Expired"}
          </span>
        </div>
        <p className="truncate text-sm text-text-secondary">
          {lastMessage ? lastMessage.body : "No messages yet"}
        </p>
      </div>
      {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald" aria-label="Unread" />}
    </Link>
  );
}
