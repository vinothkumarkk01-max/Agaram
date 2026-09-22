import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Premium empty state for "no candidate to feature today" — replaces
 * the old plain "Nothing new to introduce right now" sentence with the
 * same visual weight as the hero it stands in for, so the first
 * viewport never goes visually flat. Still perfectly honest: nothing
 * here claims a match is coming on any particular schedule, it just
 * points at the two real levers a member has (preferences, profile).
 */
export function IntroductionEmptyState({ t }: { t: Dictionary }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm px-6 py-10 sm:py-14 text-center"
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--line)",
      }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--accent-strong)" }}
      >
        {t.dashboard.introEyebrow}
      </div>
      <h2
        className="text-xl sm:text-2xl mb-2 max-w-sm mx-auto"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t.dashboard.introEmptyHeading}
      </h2>
      <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: "var(--text-soft)" }}>
        {t.dashboard.introEmptyBody}
      </p>
      <div className="flex items-center justify-center gap-5">
        <Link
          href="/onboarding/preferences"
          className="text-xs font-semibold"
          style={{ color: "var(--accent-strong)" }}
        >
          {t.dashboard.introEmptyCtaPreferences}
        </Link>
        <Link
          href="/onboarding/basic-info"
          className="text-xs font-semibold"
          style={{ color: "var(--accent-strong)" }}
        >
          {t.dashboard.introEmptyCtaStory}
        </Link>
      </div>
    </div>
  );
}
