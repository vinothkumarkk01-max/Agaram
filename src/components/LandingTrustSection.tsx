import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Landing page — "how we verify" (Sept 2026, this round). Founder
 * feedback: the landing page needed to feel "premium" on first visit,
 * and a gap analysis found the app's strongest, most defensible
 * differentiator — independent, named verification signals, not one
 * RM's word (see Agaram_Premium_PRD_v2.md §10's EliteMatrimony
 * comparison) — was invisible until after signup. This section
 * surfaces exactly the three signals that are real today (Identity,
 * Employment, Phone — matching TrustProfileSummary.tsx on the
 * dashboard), not the PRD's fuller five-signal aspiration, so nothing
 * here overclaims what a visitor will actually see once they join.
 */
export function LandingTrustSection({ t }: { t: Dictionary }) {
  const items = [
    { title: t.landing.trustIdentityTitle, desc: t.landing.trustIdentityDesc },
    { title: t.landing.trustEmploymentTitle, desc: t.landing.trustEmploymentDesc },
    { title: t.landing.trustPhoneTitle, desc: t.landing.trustPhoneDesc },
  ];

  return (
    <section id="trust" className="w-full max-w-5xl mx-auto px-4 py-16 sm:py-20 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
        <div
          className="text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--accent)" }}
        >
          {t.landing.trustEyebrow}
        </div>
        <h2
          className="text-3xl sm:text-4xl font-semibold mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t.landing.trustHeading}
        </h2>
        <p className="text-base" style={{ color: "var(--text-soft)" }}>
          {t.landing.trustSubheading}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl p-7 text-center transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              aria-hidden="true"
            >
              ✓
            </div>
            <div className="font-bold text-base mb-2">{item.title}</div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-soft)" }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
