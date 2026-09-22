import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * sitemap.xml (Sept 2026) — only the pages a search engine should
 * actually index: the public marketing surface. Every account-gated
 * route (dashboard, matches, account, admin, family/*) is deliberately
 * left out — indexing those would either 404 for a crawler with no
 * session, or worse, encourage crawling pages that require auth and
 * carry members' data. Priorities are relative, not load-bearing: the
 * landing page is what should rank, everything else is secondary.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/concierge/apply`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
