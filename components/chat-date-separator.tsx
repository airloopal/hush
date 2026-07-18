import * as React from "react";

export interface ChatDateSeparatorProps {
  date: string | Date;
}

function formatSeparatorDate(date: string | Date): string {
  const target = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(target, today)) return "Today";
  if (isSameDay(target, yesterday)) return "Yesterday";
  return target.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function ChatDateSeparator({ date }: ChatDateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-1" role="separator" aria-label={formatSeparatorDate(date)}>
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
        {formatSeparatorDate(date)}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
