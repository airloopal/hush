import * as React from "react";
import { Camera, Video } from "lucide-react";
import type { ChatMessage } from "@/lib/chat-types";
import { formatClockTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface ChatMessageBubbleProps {
  message: ChatMessage;
  /** The role of the person currently viewing the conversation. */
  viewerRole: "fan" | "creator";
}

/** Requested / Fulfilled / Dismissed — derived from our own fixed wording,
 * not stored as separate state, so the label always matches what actually
 * happened for this specific message. */
function getMediaStatusLabel(body: string): { label: string; className: string } {
  const lower = body.toLowerCase();
  if (lower.includes("delivered")) return { label: "Fulfilled", className: "bg-success-bg text-success" };
  if (lower.includes("dismissed")) return { label: "Dismissed", className: "bg-surface-muted text-text-secondary" };
  return { label: "Requested", className: "bg-warning-bg text-warning" };
}

export function ChatMessageBubble({ message, viewerRole }: ChatMessageBubbleProps) {
  if (message.type === "media-request") {
    const Icon = message.body.toLowerCase().includes("video") ? Video : Camera;
    const { label, className } = getMediaStatusLabel(message.body);
    return (
      <div className="flex justify-center py-1">
        <div className="flex max-w-[85%] items-start gap-2 rounded-lg border border-border bg-surface-muted/60 px-3 py-2">
          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <span className={cn("w-fit rounded-pill px-2 py-0.5 text-[10px] font-medium", className)}>
              {label}
            </span>
            <span className="text-xs text-text-secondary">{message.body}</span>
          </div>
        </div>
      </div>
    );
  }

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
