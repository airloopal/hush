import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoDataBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted",
        className
      )}
    >
      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
      Demo Data
    </span>
  );
}
