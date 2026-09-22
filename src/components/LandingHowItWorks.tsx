import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Landing page — "how it works" (Sept 2026, this round). Puts the
 * PRD's own signature mechanic ("3 meaningful introductions every
 * Friday" — Agaram_Premium_PRD_v2.md §1) in front of a first-time
 * visitor, ahead of signup, instead of leaving it undiscovered until
 * after account creation. Numbered on purpose — this genuinely is a
 * sequence (verify, then get introduced, then message), not
 * decoration.
 */
export function LandingHowItWorks({ t }: { t: Dictionary }) {
  const steps = [
    { title: t.landing.howStep1Title, desc: t.landing.howStep1Desc },
    { title: t.landing.howStep2Title, desc: t.landing.howStep2Desc },
    { title: t.landing.howStep3Title, desc: t.landing.howStep3Desc },
  ];

  return (
    <section
      id="how-it-works"
      className="w-full py-16 sm:py-20 scroll-mt-20"
      style={{ background: "var(--bg-sunken)" }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div
            className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: "var(--accent)" }}
          >
            {t.landing.howEyebrow}
          </div>
          <h2
            className="text-3xl sm:text-4xl font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t.landing.howHeading}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.title} className="text-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-base font-bold"
                style={{ background: "var(--accent)", color: "#fff" }}
                aria-hidden="true"
              >
                {i + 1}
              </div>
              <div className="font-bold text-base mb-2">{step.title}</div>
              <p className="text-sm leading-relaxed max-w-[26ch] mx-auto" style={{ color: "var(--text-soft)" }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
