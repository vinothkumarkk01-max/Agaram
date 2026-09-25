/**
 * The canonical public site URL — used for absolute links that have to
 * leave the app itself (Open Graph tags, sitemap.xml, robots.txt).
 *
 * NOTE — agaramiya.com was registered Sept 24, 2026 (see
 * Agaram_Naming_Trademark_Research.md), added as a custom domain in
 * Vercel, and DNS was pointed at it from the registrar. As of Sept 25,
 * confirmed LIVE — agaramiya.com (and www.agaramiya.com) both load the
 * app with a valid certificate, verified directly and in a fresh
 * Incognito window. NEXT_PUBLIC_SITE_URL was also set to
 * https://agaramiya.com as a Vercel project env var that same day.
 *
 * Remaining step: NEXT_PUBLIC_ vars are baked in at BUILD time, so this
 * only takes effect in OG tags/sitemap.xml/robots.txt once there's been
 * a fresh deploy AFTER the env var was set — it won't retroactively
 * apply to a deployment built before that. If OG previews / sitemap
 * still show the old agaram-ten.vercel.app URL, trigger a new deploy
 * (push any commit, or use Vercel's "Redeploy" button on the latest
 * deployment) and that will pick it up.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://agaram-ten.vercel.app";
