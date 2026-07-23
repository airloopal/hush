"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by the root layout itself — a different, rarer
 * case than app/error.tsx (which only catches errors within a page/route
 * segment, not the layout wrapping it). This replaces the entire document,
 * so it can't rely on ThemeProvider, fonts, or anything else the root
 * layout normally provides — it needs its own <html>/<body> and only the
 * safest, most self-contained styling.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          backgroundColor: "#0D0E0F",
          color: "#FAF8F4",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", maxWidth: 420 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "9999px",
              backgroundColor: "rgba(52, 201, 138, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
            aria-hidden="true"
          >
            ⚠
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#B4B4BE", margin: 0 }}>
            An unexpected error occurred while loading Hush. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 8,
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "#34C98A",
              color: "#14141C",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
