import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { LocaleToggle } from "@/components/LocaleToggle";
import { PortraitCollage } from "@/components/PortraitCollage";
import { LandingNav } from "@/components/LandingNav";
import { LandingTrustSection } from "@/components/LandingTrustSection";
import { LandingHowItWorks } from "@/components/LandingHowItWorks";
import { LandingPricing } from "@/components/LandingPricing";
import { LandingFaq } from "@/components/LandingFaq";
import { LandingFooter } from "@/components/LandingFooter";

export default async function Home() {
  const { locale, t } = await getDictionary();
  return (
    <div className="min-h-screen w-full flex flex-col">
      <LandingNav t={t} />
      <div
        className="w-full flex items-center justify-center px-4 py-16 sm:py-20"
        style={{
          background:
            "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
        }}
      >
        <div className="text-center w-full max-w-xl">
          {/*
            Hero redesign (Sept 2026) — founder feedback: a matrimonial
            product's hero was "almost entirely textual/functional,"
            which read as a missed opportunity. The collage of portrait
            cards leads the hero now, ahead of the wordmark, so the page
            shows people before it shows a logo — "editorial + premium +
            warm + trustworthy" rather than "swipe + dating +
            gamification" (no hearts, no swipe-deck framing, no
            gamified stats). See PortraitCollage.tsx for why these are
            placeholder cards rather than real photos for now.
          */}
          <div className="mb-8 sm:mb-10">
            <PortraitCollage />
          </div>

          {/*
            Hero positioning (Sept 2026, this round) — founder gap
            analysis: a first-time visitor couldn't tell within a few
            seconds that this is a matrimonial platform. The old single
            supporting line under the logo ("Verified members,
            thoughtful introductions, no endless browsing.") read as
            premium but category-vague.
            Uses agaramiya-lockup.png — the existing wordmark-only
            asset (monogram + "AGARAMIYA", no baked-in tagline), not
            agaramiya-logo.png, which bakes "A good beginning matters."
            into the artwork itself. That same tagline now appears
            again below as real text (t.landing.heroTagline) rather
            than pixels, so it survives independent of any single
            image and isn't shown twice.
          */}
          <Image
            src="/brand/agaramiya-lockup.png"
            alt={t.common.brand}
            width={1536}
            height={463}
            priority
            className="w-full max-w-xs mx-auto mb-5 h-auto"
          />
          <h1
            className="text-2xl sm:text-3xl font-semibold mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
          >
            {t.landing.heroHeadline}
          </h1>
          <p className="text-base mb-7" style={{ color: "var(--text-soft)" }}>
            {t.landing.heroDescription}
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/signup"
              className="rounded-xl px-6 py-3 text-base font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              {t.landing.createAccount}
            </Link>
            <Link
              href="/login"
              className="rounded-xl px-6 py-3 text-base font-bold"
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--line)",
                color: "var(--text)",
              }}
            >
              {t.landing.signIn}
            </Link>
          </div>
          <div className="flex justify-center mt-6 mb-7">
            <LocaleToggle locale={locale} />
          </div>

          {/*
            Trust strip (Sept 2026) — names the app's real differentiator
            (independent Identity/Employment/Phone checks, not one
            generic checkmark) right in the hero, instead of only after
            signup. Deliberately the same 3 signals as LandingTrustSection
            below and TrustProfileSummary on the dashboard — never a
            4th ("Education") that isn't actually implemented; see
            those two components' own comments for why. Reuses their
            existing title strings rather than inventing new copy.
          */}
          <div
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs sm:text-sm font-semibold mb-8"
            style={{ color: "var(--text-soft)" }}
          >
            {[t.landing.trustIdentityTitle, t.landing.trustEmploymentTitle, t.landing.trustPhoneTitle].map(
              (label) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" style={{ color: "var(--accent)" }}>
                    ✓
                  </span>
                  {label}
                </span>
              )
            )}
          </div>

          {/*
            Brand signature (Sept 2026) — "A good beginning matters." is
            the emotional brand line, kept distinct from the product
            positioning above rather than replacing it. Flanking
            hairlines echo the same treatment the wordmark artwork
            itself uses around this exact line.
          */}
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-8" style={{ background: "var(--gold)", opacity: 0.55 }} />
            <p
              className="text-sm italic"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-soft)" }}
            >
              {t.landing.heroTagline}
            </p>
            <span aria-hidden="true" className="h-px w-8" style={{ background: "var(--gold)", opacity: 0.55 }} />
          </div>

          {/*
            Scroll cue (Sept 2026) — founder question: with no menu on
            the page, how does a visitor know there's more below? This,
            plus LandingNav's anchor links, are the two answers. A
            plain anchor link rather than a JS scroll handler, so this
            still works with no client JS and degrades to "a link that
            jumps down the page" if animation is disabled.
          */}
          <a
            href="#trust"
            className="inline-flex flex-col items-center gap-1.5 mt-10 sm:mt-12 text-sm font-semibold motion-safe:animate-bounce"
            style={{ color: "var(--text-soft)" }}
          >
            {t.landing.scrollHint}
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>

      {/*
        Below-the-fold sections (Sept 2026, this round) — a gap
        analysis of the landing page found it was a single hero screen
        with nothing else: no trust story, no explanation of the
        weekly-introduction mechanic, no visible pricing, no FAQ, and
        only a bare Privacy Policy link where a real footer should be.
        Every section below is grounded in the app's own PRD and
        existing dictionary copy — nothing invented, and nothing that
        overclaims what's live today (see each component's own
        comment).
      */}
      <LandingTrustSection t={t} />
      <LandingHowItWorks t={t} />
      <LandingPricing t={t} />
      <LandingFaq t={t} />
      <LandingFooter t={t} />
    </div>
  );
}
