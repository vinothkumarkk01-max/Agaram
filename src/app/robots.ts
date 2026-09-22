import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt (Sept 2026). Disallows every account-gated area — a
 * crawler has no session, so these would only ever 404 for it or, once
 * verification/payments go live, index pages that shouldn't be
 * discoverable at all. `/admin` in particular is founder-only tooling,
 * never a page search engines should even attempt.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/matches",
        "/account",
        "/admin",
        "/family",
        "/onboarding",
        "/api",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
