import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Landing page — pricing preview (Sept 2026, this round). Before this,
 * a visitor couldn't see Free / Elite / Concierge or a single price
 * point without creating an account first (see the go-live checklist's
 * "premium landing experience" section). Prices match
 * src/lib/i18n/dictionary.ts's own upgrade/concierge copy and
 * Agaram_Premium_PRD_v2.md §11 exactly — nothing invented here.
 * Concierge links straight to the real, existing application page
 * (src/app/concierge/apply/page.tsx) rather than a placeholder.
 */
export function LandingPricing({ t }: { t: Dictionary }) {
  return (
    <section id="pricing" className="w-full max-w-5xl mx-auto px-4 py-16 sm:py-20 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
        <div
          className="text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--accent)" }}
        >
          {t.landing.pricingEyebrow}
        </div>
        <h2
          className="text-3xl sm:text-4xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t.landing.pricingHeading}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-stretch">
        {/* Free */}
        <div
          className="rounded-2xl p-7 flex flex-col"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <div className="font-bold text-base mb-1.5">{t.landing.pricingFreeTitle}</div>
          <div className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
            {t.landing.pricingFreePrice}
          </div>
          <p className="text-sm flex-1 mb-5" style={{ color: "var(--text-soft)" }}>
            {t.landing.pricingFreeDesc}
          </p>
          <Link
            href="/signup"
            className="rounded-xl px-4 py-2.5 text-base font-bold text-center"
            style={{ background: "var(--bg-sunken)", color: "var(--text)" }}
          >
            {t.landing.pricingFreeCta}
          </Link>
        </div>

        {/* Elite — the recommended tier, visually emphasized */}
        <div
          className="rounded-2xl p-7 flex flex-col relative"
          style={{
            background: "var(--bg-raised)",
            border: "2px solid var(--accent)",
            boxShadow: "0 8px 24px rgba(142,35,70,0.12)",
          }}
        >
          <div className="font-bold text-base mb-1.5" style={{ color: "var(--accent)" }}>
            {t.landing.pricingEliteTitle}
          </div>
          <div className="mb-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              {t.landing.pricingElitePrice}
            </span>
            <span className="text-sm" style={{ color: "var(--text-soft)" }}>
              {t.landing.pricingElitePeriod}
            </span>
          </div>
          <p className="text-sm flex-1 mb-5" style={{ color: "var(--text-soft)" }}>
            {t.landing.pricingEliteDesc}
          </p>
          <Link
            href="/signup"
            className="rounded-xl px-4 py-2.5 text-base font-bold text-center text-white"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
          >
            {t.landing.pricingEliteCta}
          </Link>
        </div>

        {/* Concierge */}
        <div
          className="rounded-2xl p-7 flex flex-col"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <div className="font-bold text-base mb-1.5">{t.landing.pricingConciergeTitle}</div>
          <div className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
            {t.landing.pricingConciergePrice}
          </div>
          <p className="text-sm flex-1 mb-5" style={{ color: "var(--text-soft)" }}>
            {t.landing.pricingConciergeDesc}
          </p>
          <Link
            href="/concierge/apply"
            className="rounded-xl px-4 py-2.5 text-base font-bold text-center"
            style={{ background: "var(--bg-sunken)", color: "var(--text)" }}
          >
            {t.landing.pricingConciergeCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
