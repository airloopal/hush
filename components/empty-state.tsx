import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-surface-muted/40 px-6 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald/10 text-emerald">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && <p className="max-w-sm text-sm text-text-secondary">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
