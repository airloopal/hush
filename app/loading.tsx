import { Loader2 } from "lucide-react";

/**
 * Next.js's route-segment Suspense fallback, shown while a page is
 * server-rendering during navigation — distinct from (and a complement
 * to) the in-page loading states pages already show while fetching their
 * own data client-side after mount.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-text-muted" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
