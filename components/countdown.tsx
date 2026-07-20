"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CountdownProps {
  /** ISO date string or Date this countdown counts down to. */
  target: string | Date;
  className?: string;
  /** Compact renders a single inline row; default renders four digit chips. */
  variant?: "default" | "compact";
  onComplete?: () => void;
}

function getRemaining(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    complete: diff <= 0,
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/**
 * Live countdown to a deadline (e.g. a 24-hour paid chat access window).
 * Digits are always rendered in tabular Geist Mono per the system's numeric
 * signature — see lib/tokens.ts `typographyTokens.mono`.
 *
 * Color: an active countdown uses the primary emerald color. Once under six
 * hours remain it switches to amber — the token reserved for warnings,
 * urgent countdowns, and "expiring soon" states.
 */
export function Countdown({ target, className, variant = "default", onComplete }: CountdownProps) {
  const targetDate = React.useMemo(() => new Date(target), [target]);
  const [remaining, setRemaining] = React.useState(() => getRemaining(targetDate));

  React.useEffect(() => {
    const id = setInterval(() => {
      const next = getRemaining(targetDate);
      setRemaining(next);
      if (next.complete) {
        clearInterval(id);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate, onComplete]);

  const isUrgent = !remaining.complete && remaining.days === 0 && remaining.hours < 6;

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "font-mono-data inline-flex items-center gap-1.5 text-sm",
          isUrgent ? "text-amber" : "text-text-primary",
          className
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            remaining.complete ? "bg-text-muted" : isUrgent ? "bg-amber" : "bg-emerald animate-pulse-dot"
          )}
        />
        {remaining.complete
          ? "Deadline passed"
          : `${remaining.days}d ${pad(remaining.hours)}h ${pad(remaining.minutes)}m`}
      </span>
    );
  }

  const units = [
    { label: "Days", value: remaining.days },
    { label: "Hrs", value: remaining.hours },
    { label: "Min", value: remaining.minutes },
    { label: "Sec", value: remaining.seconds },
  ];

  return (
    <div className={cn("inline-flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        {units.map((unit, i) => (
          <React.Fragment key={unit.label}>
            <div
              className={cn(
                "flex min-w-[3.25rem] flex-col items-center rounded-lg border px-2.5 py-1.5 shadow-sm",
                remaining.complete
                  ? "border-border bg-surface-muted"
                  : isUrgent
                  ? "border-amber/30 bg-amber/10"
                  : "border-emerald/25 bg-emerald/10"
              )}
            >
              <span
                className={cn(
                  "font-mono-data text-xl font-semibold leading-none",
                  remaining.complete ? "text-text-muted" : isUrgent ? "text-amber" : "text-emerald"
                )}
              >
                {pad(unit.value)}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wide text-text-muted">
                {unit.label}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className="font-mono-data pb-4 text-text-muted">:</span>
            )}
          </React.Fragment>
        ))}
      </div>
      {remaining.complete && (
        <p className="text-xs text-text-muted">This deadline has passed.</p>
      )}
    </div>
  );
}
