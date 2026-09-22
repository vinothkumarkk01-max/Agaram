/**
 * The canonical public site URL — used for absolute links that have to
 * leave the app itself (Open Graph tags, sitemap.xml, robots.txt).
 *
 * NOTE — update NEXT_PUBLIC_SITE_URL once agaramiya.com is registered
 * and pointed at this deployment (see Agaram_Naming_Trademark_Research.md
 * — it appeared unregistered as of the Sept 2026 research). Until then
 * this falls back to the current Vercel deployment URL, so none of the
 * code that reads this constant needs to change when the domain lands —
 * only the env var does.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://agaram-ten.vercel.app";
