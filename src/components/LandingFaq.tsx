import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Landing page — FAQ (Sept 2026, this round). Answers the questions a
 * first-time visitor actually has before signing up (privacy, cost,
 * differentiation, family involvement, data safety) rather than
 * leaving them to discover — or not discover — the answers post-signup.
 * Plain <details>/<summary> — no client JS needed for a disclosure
 * widget, so this stays a Server Component like the rest of the page.
 * The data-safety answer states only what's actually built (self-serve
 * export + permanent deletion, DPDP Act as the framework this is built
 * around) — it doesn't claim a completed legal compliance review,
 * which is still open (see the go-live checklist).
 */
export function LandingFaq({ t }: { t: Dictionary }) {
  const faqs = [
    { q: t.landing.faqQ1, a: t.landing.faqA1 },
    { q: t.landing.faqQ2, a: t.landing.faqA2 },
    { q: t.landing.faqQ3, a: t.landing.faqA3 },
    { q: t.landing.faqQ4, a: t.landing.faqA4 },
    { q: t.landing.faqQ5, a: t.landing.faqA5 },
  ];

  return (
    <section id="faq" className="w-full max-w-2xl mx-auto px-4 py-16 sm:py-20 scroll-mt-20">
      <div className="text-center mb-10">
        <div
          className="text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--accent)" }}
        >
          {t.landing.faqEyebrow}
        </div>
        <h2
          className="text-3xl sm:text-4xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t.landing.faqHeading}
        </h2>
      </div>

      <div>
        {faqs.map((item, i) => (
          <details
            key={item.q}
            className="group py-5"
            style={{ borderBottom: i < faqs.length - 1 ? "1px solid var(--line)" : "none" }}
          >
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
              <span className="font-semibold text-base">{item.q}</span>
              <span
                aria-hidden="true"
                className="shrink-0 text-xl leading-none group-open:rotate-45 transition-transform"
                style={{ color: "var(--accent)" }}
              >
                +
              </span>
            </summary>
            <p className="text-base mt-3 leading-relaxed" style={{ color: "var(--text-soft)" }}>
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
