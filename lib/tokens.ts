/**
 * Hush Design Tokens
 * ---------------------------------------------------------------------------
 * Single source of truth for the design system. These values are mirrored as
 * CSS custom properties in `app/globals.css` (so Tailwind + arbitrary CSS can
 * consume them) and re-exported here for any component that needs the raw
 * value in TypeScript (e.g. chart colors, inline SVG, canvas).
 *
 * Do not hardcode color/spacing/radius values in components — reference a
 * token (via Tailwind class or this file) so the whole system stays in sync.
 * ------------------------------------------------------------------------- */

export const colorTokens = {
  light: {
    // Base surfaces — warm white with a soft grey muted layer
    background: "#FAF8F4", // warm white
    foreground: "#1C1B19", // charcoal ink
    surface: "#FFFFFF",
    surfaceMuted: "#EFEDE7", // soft grey
    border: "#E2DFD7",

    // Brand — emerald is the primary, interactive color (CTAs, links, focus,
    // active nav/selection state).
    emerald: "#0E8F63",
    emeraldForeground: "#FFFFFF",

    // Reserved accents — NOT general brand colors. Amber is used only for
    // warnings, urgent countdowns, and "chat expiring soon" states. Violet
    // is used only for sponsored boosts / optional creator-promotion labels.
    // Coral is used only for live media (live photo/video) interactions.
    amber: "#C8862A",
    amberForeground: "#FFFFFF",
    violet: "#6C5DC7",
    violetForeground: "#FFFFFF",
    coral: "#E8604C",
    coralForeground: "#FFFFFF",

    // Status — kept semantically distinct from brand and from each other.
    success: "#3F7D3A",
    successBg: "#E5F1E2",
    danger: "#C6433E",
    dangerBg: "#FBE7E5",
    warning: "#C8862A", // unified with the amber accent
    warningBg: "#F7ECD9",
    info: "#3E63C4",
    infoBg: "#E7ECFA",

    // Text
    textPrimary: "#1C1B19",
    textSecondary: "#57544D",
    textMuted: "#8C8880",
  },
  dark: {
    background: "#0D0E0F", // near-black
    foreground: "#F2F0EC",
    surface: "#1A1B1D", // charcoal
    surfaceMuted: "#232426", // lighter charcoal
    border: "#2E2F32",

    emerald: "#34C98A",
    emeraldForeground: "#08150F",

    amber: "#F2B84B",
    amberForeground: "#14141C",
    violet: "#8B7FD6",
    violetForeground: "#14141C",
    coral: "#FF8A72",
    coralForeground: "#14141C",

    success: "#7FC274",
    successBg: "#17281A",
    danger: "#E97874",
    dangerBg: "#391E1F",
    warning: "#F2B84B", // unified with the amber accent
    warningBg: "#3A2E15",
    info: "#8FA6E8",
    infoBg: "#1D2740",

    textPrimary: "#F2F0EC",
    textSecondary: "#B7B3AB",
    textMuted: "#7A766E",
  },
} as const;

export const typographyTokens = {
  fontSans: "var(--font-geist-sans)",
  fontMono: "var(--font-geist-mono)",
  scale: {
    xs: { size: "0.75rem", lineHeight: "1rem" }, // 12/16
    sm: { size: "0.875rem", lineHeight: "1.25rem" }, // 14/20
    base: { size: "1rem", lineHeight: "1.5rem" }, // 16/24
    lg: { size: "1.125rem", lineHeight: "1.75rem" }, // 18/28
    xl: { size: "1.375rem", lineHeight: "1.85rem" }, // 22/29.6
    "2xl": { size: "1.75rem", lineHeight: "2.15rem" }, // 28/34.4
    "3xl": { size: "2.25rem", lineHeight: "2.5rem" }, // 36/40
    "4xl": { size: "3rem", lineHeight: "3.25rem" }, // 48/52
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  // Countdown / stat digits always use tabular mono figures — this is the
  // system's signature numeric treatment.
  mono: {
    letterSpacing: "0.02em",
    feature: "'tnum' 1, 'ss01' 1",
  },
} as const;

export const spacingTokens = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

export const radiusTokens = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  pill: "999px",
} as const;

export const shadowTokens = {
  sm: "0 1px 2px 0 rgb(20 20 28 / 0.06)",
  md: "0 4px 12px -2px rgb(20 20 28 / 0.10)",
  lg: "0 12px 32px -8px rgb(20 20 28 / 0.18)",
  ring: "0 0 0 3px",
} as const;

export const motionTokens = {
  fast: "120ms",
  base: "200ms",
  slow: "320ms",
  easing: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

export const breakpointTokens = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
} as const;

export const zIndexTokens = {
  navigation: 40,
  bottomNav: 40,
  modal: 50,
  toast: 60,
} as const;
