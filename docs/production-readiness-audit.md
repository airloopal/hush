# Production Readiness Audit — Report

Full-application audit against the checklist below. No business logic,
payments, messaging, or UI design changed — every fix is additive
infrastructure or a genuinely invisible (`sr-only`) accessibility
correction.

## Files created

**SEO / metadata / branding**
- `lib/site-config.ts` — central site-URL resolution (`NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` → localhost fallback), used by everything below.
- `app/robots.ts` — generates `robots.txt`. Disallows every auth-gated path (`/discover`, `/chats`, `/dashboard`, `/settings`, `/api/`, `/dev/`, etc.) so crawlers don't waste budget hitting login walls.
- `app/sitemap.ts` — generates `sitemap.xml` with only the genuinely public, worth-indexing routes (`/`, `/safety`, `/signup`, `/login`).
- `app/icon.tsx`, `app/apple-icon.tsx` — generated favicon (32×32) and Apple touch icon (180×180) via Next's built-in `ImageResponse` — no external image asset or new dependency, on-brand emerald "H" monogram.
- `app/opengraph-image.tsx` — generated 1200×630 share image for link previews (Slack, iMessage, Twitter/X, etc.), same technique.

**Error / loading boundaries (none existed before this audit)**
- `app/not-found.tsx` — 404 page, reuses `EmptyState`/`LandingHeader`/`LandingFooter`, no new visual design.
- `app/error.tsx` — route-segment error boundary with a "Try again" reset action; logs to console only, never renders the raw error to the user.
- `app/global-error.tsx` — root-layout crash boundary. This one **must** be self-contained (it replaces the entire document, including `<html>`/`<body>`, when it fires) — deliberately uses inline styles rather than Tailwind/ThemeProvider, since those come from the very layout that may have just crashed.
- `app/loading.tsx` — global route-segment Suspense fallback (the gap between navigation and first paint), distinct from the in-page data-fetching spinners individual pages already had.

**Other**
- `lib/analytics.ts` — intentionally inert analytics placeholder (`trackEvent`/`trackPageView`, no-op besides a dev-only console log). No vendor added, not called from anywhere — exists only as the one documented spot a real integration would plug into later, per "do not add new features."

## Files modified

- `app/layout.tsx` — added `metadataBase`, Open Graph (`type`, `siteName`, `title`, `description`, `url`), Twitter card (`summary_large_image`), an explicit `robots` directive, and split out a proper `viewport` export (Next 15 convention) with light/dark `theme-color`.
- `next.config.mjs` — added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` disabling camera/microphone/geolocation/payment, applied to every route.
- `app/login/page.tsx`, `app/forgot-password/page.tsx`, `app/signup/page.tsx` (both states), `app/reset-password/page.tsx`, `app/dev/diagnostics/page.tsx`, `app/not-found.tsx`, `app/error.tsx`, `app/payments/return/page.tsx` — added `sr-only` `<h1>` headings. See "Accessibility findings" below for why.

## Accessibility findings (the most substantive result of this audit)

A systematic re-check of every page's heading structure found that
`CardTitle` always renders as `<h3>` (never `<h1>`), and `EmptyState`'s
title renders as a plain `<p>` (correctly so — it's a reusable content
fragment used both as a whole page's content *and* as an inline state
within an already-headed page, so it can't assume it owns the page's
heading level). The combination meant **eight distinct page states had no
`<h1>` at all** — no page-title landmark for screen reader users
navigating by heading:

- `/login` **on mobile specifically** — its `<h1>` lived in a
  `hidden lg:flex` column, which is `display: none` (removed from the
  accessibility tree, not just visually hidden) below the `lg` breakpoint.
- `/forgot-password`, `/reset-password`, `/dev/diagnostics`
- `/signup` — both its main form state and its "check your email" success state
- `/payments/return` — one added at the page-shell level, covering every one of its conditional status branches (pending/processing/paid/failed/cancelled/expired)
- The new `/404` and error boundary pages themselves

All eight fixed with a `sr-only` `<h1>` — visually identical, present in
the DOM/accessibility tree. Verified afterward: every single page in the
app now has exactly one `<h1>` in its accessibility tree at every
viewport size (re-ran the full-app heading audit; the two files that show
"2" in a literal grep — `login` and `signup` — are correct, not
duplicates: `login`'s two `<h1>`s are complementary responsive
visibility (`hidden lg:flex` / `sr-only lg:hidden` — never both present
at once), and `signup`'s two are in mutually exclusive conditional
`return` branches).

## Broken links

Cross-referenced every `href` in the app (both plain strings and
template-literal dynamic routes) against the actual route table. **Zero
dead links found** — the link-hygiene work from earlier sprints held up
under this audit.

## Environment validation

Reviewed `lib/supabase/env.ts` (the single source of truth for reading
Supabase env vars). Already correct and required no changes:
`isSupabaseConfigured()` requires *both* the URL and anon key, so a
partially-set environment is treated as "not configured" and falls back
safely to the working local demo rather than attempting a half-broken
Supabase connection. `requireSupabasePublicEnv()`/`requireSupabaseAdminEnv()`
throw a clear, actionable `SupabaseConfigError` naming exactly which
variable is missing, only at the point something actually tries to use
Supabase — never at boot, which would otherwise break demo mode entirely.

## Bundle optimization / rerenders

Reviewed the production build's route-by-route bundle report and grepped
for the common unstable-dependency rerender pattern (inline object/array
literals in a `useEffect`/`useMemo` dependency array). Found nothing to
fix: bundle sizes are already reasonably split per route by Next's
automatic code-splitting (the public landing page ships ~125 kB First
Load JS; authenticated pages that actually need the Supabase SDK ship
~217–227 kB — nothing shipped where it isn't needed), and no unstable
dependency patterns were found. (One real instance of this exact bug was
already found and fixed in an earlier sprint's Discover page rewrite.)

## Explicitly not changed, and why

- **Content-Security-Policy**: deliberately not added. A correct CSP
  requires enumerating every legitimate external origin the app talks to
  (the Supabase project URL, its realtime websocket upgrade, font/asset
  hosts) and testing against them live — getting it wrong silently breaks
  real functionality (e.g. realtime messaging or auth redirects), which
  is out of scope for a "no functional changes" audit. The other,
  unambiguously safe headers were added instead.
- **Loading/empty/error states within existing pages**: spot-checked the
  newer Launch Sprint (L1–L5) pages specifically (payments, chat list,
  messaging) since they were built under the most time pressure — found
  them already handling loading/empty/error states appropriately (they
  were part of those sprints' own scope) and did not touch them further,
  to avoid any risk to payments/messaging behavior per this audit's own
  constraints.
- **Per-page SEO metadata**: only the root layout's defaults were
  enriched. Adding distinct Open Graph titles/descriptions per public
  page (e.g. `/safety`) would be a reasonable follow-up but wasn't
  necessary to close a genuine gap — the app has very few public,
  crawlable pages today.

## Build result

- `npm run lint` → **✔ No ESLint warnings or errors**
- `npm run typecheck` → **clean**
- `npm run build` → **compiled successfully, 0 errors**, 33 routes (6 new: `/icon`, `/apple-icon`, `/opengraph-image`, `/robots.txt`, `/sitemap.xml`, `/_not-found`; `error.tsx`/`global-error.tsx`/`loading.tsx` are boundaries, not routes, so they don't add route entries)
- `npx vitest run` → **86/86 passing** (sanity check; not part of the requested command list, but confirms nothing regressed)
