import { Zap } from "lucide-react";

export function ResponseTimeChip({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-border bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary">
      <Zap className="h-3 w-3 text-emerald" aria-hidden="true" />
      ~{minutes}m reply
    </span>
  );
}
