import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DashboardCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  /** Percentage change vs. previous period; positive shows up, negative down. */
  delta?: number;
  deltaLabel?: string;
  accent?: "amber" | "violet" | "neutral";
  className?: string;
}

// amber = warnings / urgent / expiring-soon metrics only.
// violet = sponsored boost / promo metrics only.
// neutral = the default for everything else.
const accentClasses = {
  amber: "bg-amber/10 text-amber",
  violet: "bg-violet/10 text-violet",
  neutral: "bg-surface-muted text-text-secondary",
} as const;

/** Compact metric tile — active deals, earnings, deadlines, engagement. */
export function DashboardCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel = "vs last month",
  accent = "neutral",
  className,
}: DashboardCardProps) {
  const isPositive = (delta ?? 0) >= 0;

  return (
    <Card className={cn("transition-shadow duration-base ease-signal hover:shadow-md", className)}>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        {Icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", accentClasses[accent])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </CardHeader>
      <CardContent className="flex items-end justify-between pt-0">
        <span className="font-mono-data text-3xl font-semibold leading-none">{value}</span>
        {typeof delta === "number" && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              isPositive ? "text-success" : "text-danger"
            )}
            title={deltaLabel}
          >
            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(delta)}%
          </span>
        )}
      </CardContent>
    </Card>
  );
}
