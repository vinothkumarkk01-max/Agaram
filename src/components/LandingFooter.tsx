import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { BrandMark } from "@/components/BrandMark";

/**
 * Landing page — footer (Sept 2026, this round). Before this, the only
 * thing below the hero's CTA buttons was a single bare Privacy Policy
 * link — no support contact, no company info, nothing consistent
 * across a return visit. Deliberately does NOT link a Terms of Service
 * page: none exists yet (see the go-live checklist's legal section,
 * which the founder is handling directly) — linking one here would
 * mean fabricating legal text this component has no business writing.
 */
export function LandingFooter({ t }: { t: Dictionary }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className="w-full py-12"
      style={{ borderTop: "1px solid var(--line)", background: "var(--bg-sunken)" }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandMark size={32} alt={t.common.brand} />
            <div>
              <div className="font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>
                {t.common.brand}
              </div>
              <div className="text-sm" style={{ color: "var(--text-soft)" }}>
                {t.landing.footerTagline}
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-5 text-sm font-semibold">
            <Link href="/support" style={{ color: "var(--text-soft)" }}>
              {t.landing.footerSupport}
            </Link>
            <Link href="/privacy" style={{ color: "var(--text-soft)" }}>
              {t.landing.footerPrivacy}
            </Link>
          </nav>
        </div>

        <div
          className="mt-8 pt-6 text-sm"
          style={{ borderTop: "1px solid var(--line)", color: "var(--text-soft)" }}
        >
          © {year} {t.common.brand}. {t.landing.footerRights}
        </div>
      </div>
    </footer>
  );
}
