import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  // Only the routes that are both public (see middleware.ts's
  // PUBLIC_ROUTES) and actually meant for search engines — auth pages
  // like /login, /forgot-password, /reset-password are public (no login
  // wall) but not worth indexing, and /design-system is an internal
  // reference page, not a marketing page.
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/safety`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
