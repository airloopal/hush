import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Ban, Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusKind = "draft" | "pending" | "live" | "completed" | "expired" | "expiring" | "blocked";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      status: {
        draft: "border-border bg-surface-muted text-text-secondary",
        pending: "border-transparent bg-warning-bg text-warning",
        live: "border-transparent bg-success-bg text-success",
        completed: "border-transparent bg-info-bg text-info",
        expired: "border-transparent bg-danger-bg text-danger",
        // Amber is reserved for warnings/expiring-soon states — see lib/tokens.ts.
        expiring: "border-transparent bg-amber/15 text-amber",
        blocked: "border-transparent bg-danger-bg text-danger",
      } satisfies Record<StatusKind, string>,
    },
    defaultVariants: { status: "draft" },
  }
);

const statusConfig: Record<StatusKind, { label: string; icon: React.ElementType; pulse?: boolean }> = {
  draft: { label: "Draft", icon: Circle },
  pending: { label: "Pending", icon: Clock },
  live: { label: "Live", icon: Circle, pulse: true },
  completed: { label: "Completed", icon: CheckCircle2 },
  expired: { label: "Expired", icon: AlertCircle },
  expiring: { label: "Expiring Soon", icon: Clock },
  blocked: { label: "Blocked", icon: Ban },
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: StatusKind;
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const { label, icon: Icon, pulse } = statusConfig[status];
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      <Icon className={cn("h-3 w-3", pulse && "animate-pulse-dot fill-current")} />
      {label}
    </span>
  );
}

export { StatusBadge };
