import type { Dictionary } from "@/lib/i18n/dictionary";
import type { GreetingKey } from "@/lib/greeting";

function greetingPrefix(t: Dictionary, key: GreetingKey): string {
  switch (key) {
    case "morning":
      return t.dashboard.greetingMorningPrefix;
    case "afternoon":
      return t.dashboard.greetingAfternoonPrefix;
    case "evening":
      return t.dashboard.greetingEveningPrefix;
  }
}

/**
 * The dashboard's emotional opener (Sept 2026 redesign) — replaces the
 * old "[avatar] Full Name" heading, which made the member's OWN
 * identity the first and largest thing on the page. Deliberately no
 * profile photo, avatar or account chrome here at all — that already
 * lives in DashboardTopBar's compact menu button; repeating it here
 * would put the member's own profile back in competition with the
 * introduction below it, the exact hierarchy problem this redesign is
 * meant to fix.
 */
export function WelcomeHeader({
  t,
  greetingKey,
  firstName,
  ready = true,
}: {
  t: Dictionary;
  greetingKey: GreetingKey;
  firstName: string;
  /** false while identity verification is still required — the
   * "introductions are ready" line would be untrue before that. */
  ready?: boolean;
}) {
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
        {greetingPrefix(t, greetingKey)}
        {firstName}.
      </h1>
      {ready ? (
        <>
          <p className="text-base sm:text-lg mb-0.5">{t.dashboard.heroReadyHeading}</p>
          <p className="text-sm" style={{ color: "var(--text-soft)" }}>
            {t.dashboard.heroReadyTagline}
          </p>
        </>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-soft)" }}>
          {t.dashboard.verifyToUnlock}
        </p>
      )}
    </div>
  );
}
