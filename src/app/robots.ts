import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt (Sept 2026). Disallows every account-gated area — a
 * crawler has no session, so these would only ever 404 for it or, once
 * verification/payments go live, index pages that shouldn't be
 * discoverable at all. `/admin` in particular is founder-only tooling,
 * never a page search engines should even attempt.
 *
 * Preview vs Production (Sept 2026): on anything other than the real
 * Production deployment (a Preview URL, or local `next build`), this
 * disallows everything — a crawler has no business indexing an R&D
 * build at all. next.config.ts's X-Robots-Tag header is the header a
 * crawler that already indexed a URL actually has to respect; this is
 * the polite ask for one that hasn't crawled it yet.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

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
