"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingShellProps {
  title: string;
  description?: string;
  /** Href for the back link; omit to hide it. */
  backHref?: string;
  step?: number;
  totalSteps?: number;
  children: React.ReactNode;
  className?: string;
}

/** Shared layout for every /onboarding/* screen — keeps pages small. */
export function OnboardingShell({
  title,
  description,
  backHref,
  step,
  totalSteps,
  children,
  className,
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container flex max-w-lg flex-col gap-8 py-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors duration-fast ease-signal hover:text-text-primary"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
            ) : (
              <span />
            )}
            {step && totalSteps && (
              <span className="font-mono-data text-xs text-text-muted">
                Step {step} of {totalSteps}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-text-secondary">{description}</p>}
          </div>
        </div>
        <div className={cn("flex flex-col gap-6", className)}>{children}</div>
      </div>
    </div>
  );
}
