import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Support / contact page (Sept 2026) — before this, there was no way
 * for a member, a partner, or press to reach a human outside the
 * in-app grievance email buried in /privacy (see the go-live
 * checklist's "ops & polish" section). Deliberately simple: two real
 * addresses and a Concierge link, not a contact form — this is a
 * solo-founder operation right now, and a form that promises a
 * ticketing system that doesn't exist would be less honest than a
 * plain mailto.
 *
 * Sept 2026 — now uses support@agaramiya.com, the real address on the
 * newly-registered agaramiya.com domain, replacing the earlier
 * vinothkumarkk01@gmail.com placeholder (itself standing in for the
 * founder's netradyne.com work address, which is never used anywhere
 * in this project — that standing instruction is unaffected by this
 * change, it's just superseded by a better, permanent address now
 * that one exists).
 */
export default async function SupportPage() {
  const { t } = await getDictionary();
  const SUPPORT_EMAIL = "support@agaramiya.com";

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div
            className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: "var(--accent)" }}
          >
            {t.support.eyebrow}
          </div>
          <h1
            className="text-3xl sm:text-4xl font-semibold mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t.support.heading}
          </h1>
          <p className="text-base" style={{ color: "var(--text-soft)" }}>
            {t.support.subheading}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
          >
            <div className="font-bold text-base mb-1.5">{t.support.generalHeading}</div>
            <p className="text-sm mb-3" style={{ color: "var(--text-soft)" }}>
              {t.support.generalDesc}
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-base font-semibold underline"
              style={{ color: "var(--accent)" }}
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
          >
            <div className="font-bold text-base mb-1.5">{t.support.privacyHeading}</div>
            <p className="text-sm mb-3" style={{ color: "var(--text-soft)" }}>
              {t.support.privacyDesc}
            </p>
            <Link
              href="/privacy"
              className="text-base font-semibold underline"
              style={{ color: "var(--accent)" }}
            >
              {t.common.privacyPolicy}
            </Link>
          </div>

          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--accent-soft)", border: "1px solid var(--line)" }}
          >
            <div className="font-bold text-base mb-1.5">{t.support.conciergeHeading}</div>
            <p className="text-sm mb-3" style={{ color: "var(--text-soft)" }}>
              {t.support.conciergeDesc}
            </p>
            <Link
              href="/concierge/apply"
              className="inline-block rounded-xl px-4 py-2 text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
            >
              {t.support.conciergeCta}
            </Link>
          </div>
        </div>

        <p className="text-sm text-center mt-6" style={{ color: "var(--text-soft)" }}>
          {t.support.responseNote}
        </p>

        <p className="text-sm text-center mt-8">
          <Link href="/" className="underline" style={{ color: "var(--text-soft)" }}>
            {t.support.backHome}
          </Link>
        </p>
      </div>
    </div>
  );
}
