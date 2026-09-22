import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { intlLocale, type Locale } from "@/lib/i18n/locale";

/**
 * "Your membership" (right column) — the benefits shown for an Elite
 * member are the app's REAL benefits (upgrade.benefit1/2/3), just
 * trimmed to fit a compact panel, not the invented "Curated
 * introductions / Advanced verification" examples a generic brief
 * might suggest. Free members get a plain, single upgrade link rather
 * than a repeated sales pitch — the full pitch already lives on
 * /upgrade.
 */
export function MembershipPanel({
  t,
  locale,
  isElite,
  expiresAt,
}: {
  t: Dictionary;
  locale: Locale;
  isElite: boolean;
  expiresAt: string | null;
}) {
  return (
    <div className="rounded-xl p-4 text-sm" style={{ background: "var(--bg-sunken)" }}>
      <div className="font-semibold mb-2">{t.dashboard.membershipHeading}</div>
      {isElite ? (
        <>
          <div className="font-semibold mb-1" style={{ color: "var(--ok)" }}>
            {t.account.billingBadgeElite}
          </div>
          {expiresAt && (
            <div className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
              {t.dashboard.eliteUntilPrefix}
              {new Date(expiresAt).toLocaleDateString(intlLocale(locale))}
            </div>
          )}
          <ul className="flex flex-col gap-1 mb-3">
            <li className="text-xs" style={{ color: "var(--text-soft)" }}>
              ✓ {t.dashboard.membershipBenefitFullProfile}
            </li>
            <li className="text-xs" style={{ color: "var(--text-soft)" }}>
              ✓ {t.dashboard.membershipBenefitMessaging}
            </li>
          </ul>
        </>
      ) : (
        <div className="mb-3" style={{ color: "var(--text-soft)" }}>
          {t.dashboard.freePlan}
        </div>
      )}
      <Link href="/upgrade" className="text-xs font-semibold" style={{ color: "var(--accent-strong)" }}>
        {t.dashboard.membershipManage}
      </Link>
    </div>
  );
}
