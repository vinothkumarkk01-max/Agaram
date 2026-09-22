import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { LocaleToggle } from "@/components/LocaleToggle";
import { PortraitCollage } from "@/components/PortraitCollage";

export default async function Home() {
  const { locale, t } = await getDictionary();
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-12"
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
        <p className="text-sm mb-8" style={{ color: "var(--text-soft)" }}>
          {t.landing.tagline}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/signup"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            {t.landing.createAccount}
          </Link>
          <Link
            href="/login"
            className="rounded-xl px-5 py-2.5 text-sm font-bold"
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
        <p className="text-xs mt-6" style={{ color: "var(--text-soft)" }}>
          <Link href="/privacy" className="underline">
            {t.common.privacyPolicy}
          </Link>
        </p>
      </div>
    </div>
  );
}
