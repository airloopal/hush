/**
 * Analytics placeholder — intentionally inert.
 *
 * No analytics vendor is wired up. This exists purely as a single,
 * documented call site so a real integration (Vercel Analytics, Plausible,
 * PostHog, etc.) has one obvious place to add itself later, rather than
 * scattering vendor-specific calls across pages.
 *
 * trackEvent() currently does nothing but log in development, so nothing
 * about the app's behavior changes by importing/calling it. Wiring a real
 * provider means implementing the body of this function (and, for most
 * providers, adding their <Script>/provider component to app/layout.tsx)
 * — nothing else in the codebase needs to change. Not called from
 * anywhere yet — this sprint only adds the placeholder itself, per "do
 * not add new features."
 */
export function trackEvent(name: string, properties?: Record<string, string | number | boolean>): void {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[analytics:noop]", name, properties ?? {});
  }
}

export function trackPageView(path: string): void {
  trackEvent("page_view", { path });
}
