"use client";

import * as React from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MESSAGE_MAX_LENGTH } from "@/lib/chat";

export interface ChatComposerProps {
  disabled: boolean;
  disabledReason?: string;
  onSend: (body: string) => void;
}

export function ChatComposer({ disabled, disabledReason, onSend }: ChatComposerProps) {
  const [value, setValue] = React.useState("");

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed.slice(0, MESSAGE_MAX_LENGTH));
    setValue("");
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-border bg-surface p-3">
      {disabled && disabledReason && (
        <p className="text-xs text-text-muted">{disabledReason}</p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
          placeholder={disabled ? "Chat access has ended" : "Write a message"}
          rows={1}
          maxLength={MESSAGE_MAX_LENGTH}
          className="flex max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors duration-fast ease-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button size="icon" onClick={handleSend} disabled={disabled || !value.trim()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
