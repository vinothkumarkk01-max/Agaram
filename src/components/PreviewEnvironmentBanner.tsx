/**
 * Shown only when this deployment isn't the real Production site (see
 * README, "Environments: Preview vs Production") — a Preview
 * deployment (any branch/PR) or local `next dev`/`next build` all get
 * VERCEL_ENV values other than "production". Read server-side in
 * layout.tsx and passed down as a plain boolean, so no client-side env
 * var exposure is needed for this.
 *
 * Purpose: a solo founder (and anyone else who ends up on a preview
 * URL) should never be able to mistake an R&D build — possibly wired
 * to a separate, throwaway Supabase project and Razorpay TEST keys —
 * for the real site with real members' data.
 */
export function PreviewEnvironmentBanner() {
  return (
    <div
      className="w-full text-center text-xs font-semibold py-1.5 px-4"
      style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
    >
      PREVIEW ENVIRONMENT — test data only, not the live site
    </div>
  );
}
