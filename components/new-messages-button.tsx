import * as React from "react";
import { ArrowDown } from "lucide-react";

export interface NewMessagesButtonProps {
  onClick: () => void;
}

export function NewMessagesButton({ onClick }: NewMessagesButtonProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-pill bg-emerald px-3.5 py-1.5 text-xs font-medium text-emerald-foreground shadow-md transition-colors duration-fast ease-signal hover:bg-emerald/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowDown className="h-3.5 w-3.5" />
        New messages
      </button>
    </div>
  );
}
