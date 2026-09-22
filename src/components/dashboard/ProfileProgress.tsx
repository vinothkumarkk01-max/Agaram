import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { computeStoryCompleteness, type StorySignal } from "@/lib/profileCompleteness";

function nextStepLabel(t: Dictionary, key: StorySignal["key"]): string {
  switch (key) {
    case "photo":
      return t.dashboard.storyNextPhoto;
    case "aboutMe":
      return t.dashboard.storyNextAboutMe;
    case "employment":
      return t.dashboard.storyNextEmployment;
    case "background":
      return t.dashboard.storyNextBackground;
    case "jathagam":
      return t.dashboard.storyNextJathagam;
  }
}

/**
 * "Complete your story" (right column) — a plain, real percentage from
 * computeStoryCompleteness(), never an arbitrary number. Compact by
 * design: a thin progress bar, the count, and exactly one next step —
 * the whole point of this panel is to point at ONE thing to do next,
 * not to audit the entire profile.
 */
export function ProfileProgress({
  t,
  hasPhoto,
  hasAboutMe,
  employmentVerified,
  hasBackground,
  hasJathagam,
}: {
  t: Dictionary;
  hasPhoto: boolean;
  hasAboutMe: boolean;
  employmentVerified: boolean;
  hasBackground: boolean;
  hasJathagam: boolean;
}) {
  const { percent, nextSignal } = computeStoryCompleteness({
    hasPhoto,
    hasAboutMe,
    employmentVerified,
    hasBackground,
    hasJathagam,
  });

  return (
    <div className="rounded-xl p-4 text-sm" style={{ background: "var(--bg-sunken)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{t.dashboard.storyHeading}</span>
        <span className="text-xs font-semibold" style={{ color: "var(--text-soft)" }}>
          {percent}
          {t.dashboard.storyPercentSuffix}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden mb-3"
        style={{ background: "var(--line)" }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background: "linear-gradient(90deg, var(--accent), var(--accent-strong))",
          }}
        />
      </div>
      {nextSignal ? (
        <Link href={nextSignal.href} className="text-xs font-semibold" style={{ color: "var(--accent-strong)" }}>
          {nextStepLabel(t, nextSignal.key)} · {t.dashboard.storyContinue}
        </Link>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-soft)" }}>
          {t.dashboard.storyAllDone}
        </p>
      )}
    </div>
  );
}
