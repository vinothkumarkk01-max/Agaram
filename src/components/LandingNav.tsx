import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { BrandMark } from "@/components/BrandMark";

/**
 * Landing page — sticky top nav (Sept 2026, this round). Founder
 * question, and a fair one: with no menu on the page at all, how does
 * a visitor know there's more below the hero? Two answers, both
 * shipped this round — this nav (which also doubles as wayfinding once
 * they've scrolled past the hero) and the bouncing scroll cue at the
 * bottom of the hero itself (see page.tsx).
 *
 * Deliberately brand + anchor links only — no Sign in / Create account
 * here. The first version of this nav duplicated the hero's own
 * Sign in / Create account buttons right above them in the same
 * viewport, which the founder flagged as looking like an accidental
 * repeat rather than an intentional "always-visible CTA" pattern. The
 * hero below keeps the one prominent pair of buttons; this nav's job
 * is wayfinding, not a second conversion point.
 *
 * The link targets (#trust, #how-it-works, #pricing, #faq) are anchors
 * on the section components below — each carries `scroll-mt-20` so a
 * jump doesn't land the section title underneath this sticky bar.
 * Deliberately no mobile hamburger menu: the anchor links hide below
 * `sm`, keeping this a Server Component with no client JS — a
 * one-page marketing site doesn't need a slide-out drawer for four
 * anchor links, and the brand mark alone is a fine, honest nav on a
 * phone (a visitor can still scroll or use the bounce cue).
 */
export function LandingNav({ t }: { t: Dictionary }) {
  const links = [
    { href: "#trust", label: t.landing.navTrust },
    { href: "#how-it-works", label: t.landing.navHow },
    { href: "#pricing", label: t.landing.navPricing },
    { href: "#faq", label: t.landing.navFaq },
  ];

  return (
    <header
      className="sticky top-0 z-20 w-full backdrop-blur"
      style={{
        background: "rgba(250, 247, 242, 0.85)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <BrandMark size={32} alt={t.common.brand} />
          <span
            className="font-bold text-base"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t.common.brand}
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-7" aria-label={t.common.brand}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold"
              style={{ color: "var(--text-soft)" }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
