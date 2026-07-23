import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#0D0E0F",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#34C98A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#14141C",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            H
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: "#FAF8F4" }}>Hush</div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 600, color: "#FAF8F4", lineHeight: 1.15, maxWidth: 900 }}>
          Pay for the conversation.
        </div>
        <div style={{ fontSize: 56, fontWeight: 600, color: "#34C98A", lineHeight: 1.15 }}>
          Not another subscription.
        </div>
        <div style={{ fontSize: 26, color: "#B4B4BE", marginTop: 32, maxWidth: 820 }}>
          Unlock 24 hours of unlimited private text with creators.
        </div>
      </div>
    ),
    { ...size }
  );
}
