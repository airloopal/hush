/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Applies to every route. Deliberately omits Content-Security-Policy:
        // getting one right requires knowing every external origin the app
        // legitimately talks to (Supabase project URL, its realtime
        // websocket, any CDN/font hosts) and testing against them live —
        // getting it wrong risks silently breaking real functionality,
        // which is out of scope for a "no functional changes" audit. The
        // headers below carry no such risk.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
