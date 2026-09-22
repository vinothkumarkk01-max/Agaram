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
            The full brand lockup (monogram + wordmark + "A good
            beginning matters." tagline) already carries the tagline as
            part of the artwork itself — see public/brand/README-ish
            note in the icon-generation script's comment for where this
            asset came from. t.landing.tagline below is a second,
            descriptive line, not a duplicate of the image's own tagline.
          */}
          <Image
            src="/brand/agaramiya-logo.png"
            alt={t.common.brand}
            width={1536}
            height={586}
            priority
            className="w-full max-w-sm mx-auto mb-6 h-auto"
          />
          <p className="text-base mb-8" style={{ color: "var(--text-soft)" }}>
            {t.landing.tagline}
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
          <div className="flex justify-center mt-6">
            <LocaleToggle locale={locale} />
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
            className="inline-flex flex-col items-center gap-1.5 mt-12 sm:mt-14 text-sm font-semibold motion-safe:animate-bounce"
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
