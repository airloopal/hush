import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
        },
        border: "var(--border)",
        emerald: {
          DEFAULT: "var(--emerald)",
          foreground: "var(--emerald-foreground)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          foreground: "var(--amber-foreground)",
        },
        violet: {
          DEFAULT: "var(--violet)",
          foreground: "var(--violet-foreground)",
        },
        coral: {
          DEFAULT: "var(--coral)",
          foreground: "var(--coral-foreground)",
        },
        success: { DEFAULT: "var(--success)", bg: "var(--success-bg)" },
        danger: { DEFAULT: "var(--danger)", bg: "var(--danger-bg)" },
        warning: { DEFAULT: "var(--warning)", bg: "var(--warning-bg)" },
        info: { DEFAULT: "var(--info)", bg: "var(--info-bg)" },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        signal: "cubic-bezier(0.2, 0, 0, 1)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "toast-in": {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",
        "toast-in": "toast-in 200ms cubic-bezier(0.2, 0, 0, 1)",
        "fade-in": "fade-in 500ms cubic-bezier(0.2, 0, 0, 1) both",
        "slide-up": "slide-up 500ms cubic-bezier(0.2, 0, 0, 1) both",
        "scale-in": "scale-in 400ms cubic-bezier(0.2, 0, 0, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
