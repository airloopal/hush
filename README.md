# Hush — UI Design System

A reusable UI layer built for **Hush**, a paid-conversation platform where
creators across gaming, music, fitness, lifestyle, expert-advice, and
lawful adult (18+) categories sell time-boxed chat access. This package is
**UI-only**: no auth, payments, database, or business logic — every value
shown on the showcase page (`app/page.tsx`) comes from `lib/mock-data.ts`.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui conventions ·
Radix primitives · Lucide React · Geist Sans / Geist Mono.

## Design direction

- **Palette** — warm white / soft grey backgrounds in light mode, charcoal /
  near-black in dark mode. **Emerald** is the primary, interactive brand
  color (buttons, links, focus states, active nav, selected pills).
  **Amber** and **violet** are reserved accents, not general brand colors:
  amber appears only for warnings, urgent countdowns, and chats expiring
  soon; violet appears only on sponsored-boost / creator-promotion labels.
  Success, danger, warning, and info stay semantically distinct status
  colors.
- **Type** — Geist Sans for UI text; Geist Mono with tabular figures for
  every number that changes or gets scanned quickly (countdowns, stats,
  prices) — this is the system's signature numeric treatment.
- **Shape** — 10–14px corner radius on cards/inputs, pill radius on
  badges/pills, 1px hairline borders for structure.
- **Light/dark** — class-based theming via `next-themes`; every color is a
  CSS variable in `app/globals.css`, so components never hardcode hex.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to see the showcase page with every
component and token in one place, including Hush's core example: a
24-hour paid chat access window with unlimited text, separately priced
live photo / live video add-ons, automatic last-seen status, and a
visible conversation countdown.

## Structure

```
app/
  layout.tsx        Root layout: Geist fonts, ThemeProvider, Toaster
  globals.css        CSS variable tokens (light + dark), base styles
  page.tsx           Showcase page — every component, mock data only
components/
  theme-provider.tsx Light/dark provider (next-themes)
  theme-toggle.tsx    Light/dark toggle button
  navigation-bar.tsx  Top nav (desktop/tablet)
  bottom-nav.tsx      Bottom tab bar (mobile)
  countdown.tsx        Access/deadline countdown (signature numeric component)
  creator-card.tsx     Creator profile summary card
  dashboard-card.tsx   Metric/stat tile
  ui/
    button.tsx
    card.tsx
    input.tsx
    modal.tsx          Dialog (Radix)
    avatar.tsx
    status-badge.tsx    draft | pending | live | completed | expired
    category-pill.tsx   Filterable niche/category tag
    toast.tsx           Toast primitives (Radix)
    use-toast.ts        Imperative toast queue hook
    toaster.tsx         Mounts the active toast queue
lib/
  tokens.ts           Source of truth for color/type/spacing/radius/shadow
  mock-data.ts         Mock data for the showcase page only
  utils.ts             cn() class-merge helper, formatLastSeen() display helper
```

## Using this in a new page

1. Wrap nothing extra — `ThemeProvider` and `Toaster` are already mounted
   in the root layout.
2. Compose pages from `components/*` and `components/ui/*`. Pass real data
   in as props; none of these components fetch anything themselves.
3. Reach for a token (Tailwind class backed by a CSS variable, or a value
   from `lib/tokens.ts`) instead of a hardcoded color/spacing/radius value.
4. Keep amber for warnings/urgent-countdown/expiring-chat states only, and
   violet for sponsored-boost/promo labels only — everything else should
   reach for emerald (primary) or neutral surfaces.
5. `NavigationBar` is hidden below `md`; pair it with `BottomNav` (hidden
   at `md` and above) so every page has responsive navigation for free.

## Extending tokens

Add or change a value in **both** `lib/tokens.ts` (TS-readable) and the
matching CSS variable in `app/globals.css` (`:root` for light, `.dark` for
dark). Then reference it from `tailwind.config.ts` if it needs a utility
class.
