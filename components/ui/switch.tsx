"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors duration-fast ease-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald" : "border border-border bg-surface-muted",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-fast ease-signal",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";
