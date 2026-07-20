"use client";

import * as React from "react";
import { Info, X } from "lucide-react";
import { dismissDemoBanner, isDemoBannerDismissed } from "@/lib/demo-banner-storage";

export function DemoBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setVisible(!isDemoBannerDismissed());
  }, []);

  if (!visible) return null;

  return (
    <div className="border-b border-violet/20 bg-violet/5 px-4 py-2.5" role="status">
      <div className="container flex items-center gap-3">
        <Info className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
        <p className="flex-1 text-xs text-text-secondary sm:text-sm">
          <span className="font-medium text-text-primary">Demo Mode.</span> This experience uses
          local demonstration data. Future versions will connect to live authentication and
          payments.
        </p>
        <button
          type="button"
          aria-label="Dismiss demo mode notice"
          onClick={() => {
            dismissDemoBanner();
            setVisible(false);
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-fast ease-signal hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
