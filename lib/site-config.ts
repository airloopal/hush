/**
 * Resolves the canonical site URL for metadata (Open Graph, canonical
 * links, sitemap, robots.txt). Priority:
 * 1. NEXT_PUBLIC_SITE_URL — set this in production for your real domain.
 * 2. VERCEL_URL — automatically provided by Vercel for previews/deploys
 *    that haven't set a custom domain yet.
 * 3. http://localhost:3000 — local development fallback.
 *
 * Centralized here so nothing else has to duplicate this fallback chain.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
