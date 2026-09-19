import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpgradeButton } from "@/components/UpgradeButton";
import { getDictionary } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/locale";

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { locale, t } = await getDictionary();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  const expiresAt = profile?.subscription_expires_at
    ? new Date(profile.subscription_expires_at)
    : null;
  const now = new Date();
  const isElite = profile?.subscription_tier === "elite" && (!expiresAt || expiresAt > now);
  const hasExpiredElite =
    profile?.subscription_tier === "elite" && !!expiresAt && expiresAt <= now;

  // Within 14 days of lapsing, lead with a renewal prompt rather than
  // the plain "you're on Elite" line — same underlying checkout either
  // way (see UpgradeButton), just a more useful framing near the edge.
  const daysLeft = expiresAt
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const isExpiringSoon = isElite && daysLeft !== null && daysLeft <= 14;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-sm"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
      >
        <Link
          href="/dashboard"
          className="text-xs font-semibold inline-flex items-center gap-1.5 mb-6"
          style={{ color: "var(--text-soft)" }}
        >
          {t.common.backDashboard}
        </Link>

        {isExpiringSoon ? (
          <>
            <div
              className="text-xs uppercase tracking-wider font-semibold mb-2.5"
              style={{ color: "var(--accent-strong)" }}
            >
              {t.upgrade.eliteLabel}
            </div>
            <h1
              className="text-2xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t.upgrade.expiringSoonTitle}
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
              {t.upgrade.expiringSoonPrefix}
              {expiresAt!.toLocaleDateString(intlLocale(locale))}
              {t.upgrade.expiringSoonSuffix}
            </p>
            <UpgradeButton
              userEmail={user.email ?? undefined}
              t={t}
              label={t.upgrade.renewButtonLabel}
            />
            <p
              className="text-xs text-center mt-4"
              style={{ color: "var(--text-soft)" }}
            >
              {t.upgrade.renewalHint}
            </p>
          </>
        ) : isElite ? (
          <>
            <h1
              className="text-2xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t.upgrade.youreOnElite}
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
              {t.upgrade.activeUntilPrefix}
              {expiresAt ? expiresAt.toLocaleDateString(intlLocale(locale)) : "—"}
              {t.upgrade.activeUntilSuffix}
            </p>
            <UpgradeButton
              userEmail={user.email ?? undefined}
              t={t}
              label={t.upgrade.renewButtonLabel}
            />
            <p
              className="text-xs text-center mt-4"
              style={{ color: "var(--text-soft)" }}
            >
              {t.upgrade.renewalHint}
            </p>
          </>
        ) : (
          <>
            <div
              className="text-xs uppercase tracking-wider font-semibold mb-2.5"
              style={{ color: "var(--accent-strong)" }}
            >
              {t.upgrade.eliteLabel}
            </div>
            <h1
              className="text-2xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {hasExpiredElite ? t.upgrade.expiredTitle : t.upgrade.eliteTitle}
            </h1>
            {hasExpiredElite && (
              <p className="text-sm mb-2" style={{ color: "var(--text-soft)" }}>
                {t.upgrade.expiredPrefix}
                {expiresAt!.toLocaleDateString(intlLocale(locale))}
                {t.upgrade.expiredSuffix}
              </p>
            )}
            <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
              {t.upgrade.pricing}
            </p>
            <ul
              className="text-sm mb-8 flex flex-col gap-2.5"
              style={{ color: "var(--text)" }}
            >
              <li>{t.upgrade.benefit1}</li>
              <li>{t.upgrade.benefit2}</li>
              <li>{t.upgrade.benefit3}</li>
            </ul>
            <UpgradeButton
              userEmail={user.email ?? undefined}
              t={t}
              label={hasExpiredElite ? t.upgrade.renewButtonLabel : undefined}
            />
            <p
              className="text-xs text-center mt-4"
              style={{ color: "var(--text-soft)" }}
            >
              {t.upgrade.oneTimeNote}
            </p>
          </>
        )}
      </div>

      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-sm mt-4"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
      >
        <div
          className="text-xs uppercase tracking-wider font-semibold mb-2"
          style={{ color: "var(--accent-strong)" }}
        >
          {t.concierge.label}
        </div>
        <h2 className="text-lg mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
          {t.concierge.cardTitle}
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
          {t.concierge.cardDesc}
        </p>
        <Link
          href="/concierge/apply"
          className="inline-block rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{
            background: "var(--bg-sunken)",
            border: "1px solid var(--line)",
            color: "var(--text)",
          }}
        >
          {t.concierge.cardCta}
        </Link>
      </div>
    </div>
  );
}
