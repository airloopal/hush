import * as React from "react";
import type { ChatMessage } from "@/lib/chat-types";
import { formatClockTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface ChatMessageBubbleProps {
  message: ChatMessage;
  /** The role of the person currently viewing the conversation. */
  viewerRole: "fan" | "creator";
}

export function ChatMessageBubble({ message, viewerRole }: ChatMessageBubbleProps) {
  if (message.senderRole === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-pill bg-surface-muted px-3 py-1 text-xs text-text-muted">
          {message.body}
        </span>
      </div>
    );
  }

  const isOwn = message.senderRole === viewerRole;

  return (
    <div className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm",
          isOwn ? "bg-emerald text-emerald-foreground" : "border border-border bg-surface-muted text-text-primary"
        )}
      >
        {message.body}
      </div>
      <span className="px-1 text-[11px] text-text-muted">{formatClockTime(message.sentAt)}</span>
    </div>
  );
}
