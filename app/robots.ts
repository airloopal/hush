import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Everything auth-gated is disallowed for crawlers — search
        // engines can't authenticate anyway, and this keeps them from
        // wasting crawl budget hammering pages that will just redirect
        // to /login. /api/* is disallowed outright (never meant to be
        // indexed). /dev/* is the go-live diagnostics page — never for
        // public consumption.
        disallow: ["/api/", "/dev/", "/discover", "/chats", "/dashboard", "/settings", "/notifications", "/conversations", "/creators/", "/payments/", "/onboarding/"],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
