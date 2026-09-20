import type { Dictionary } from "@/lib/i18n/dictionary";
import {
  buildMatchReasons,
  buildCompatibilityBreakdown,
  type CompatibilityLine,
} from "@/lib/matchReasons";
import type { MaskedCandidate } from "@/components/CandidateCard";

type IntroPreferences = {
  age_min: number;
  age_max: number;
  preferred_locations: string[];
  family_type_preference?: string;
  diet_preference?: string;
  native_district_preference?: string | null;
  community_preference?: string;
};

/**
 * "Today's introduction" (dashboard) — the PRD's promised preview-
 * introduction moment, shown ahead of the weekly digest email rather
 * than making a newly-verified member wait until Friday for the
 * first sign anything is happening. This is NOT a fabricated "best
 * match" score (see matchReasons.ts's own honesty note) — every
 * candidate returned by get_match_candidates() already satisfies the
 * viewer's hard preference filters equally. The scoring here only
 * decides which of several equally-VALID candidates to feature first
 * on a single-item teaser card; it's never shown to the member, and
 * it's built entirely from the same plain, honest reasons/
 * compatibility lines Browse already displays for every candidate.
 */
export function pickTodaysIntroduction(
  t: Dictionary,
  candidates: MaskedCandidate[],
  myPreferences: IntroPreferences
): { candidate: MaskedCandidate; reasons: string[]; compatibility: CompatibilityLine[] } | null {
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestReasons = buildMatchReasons(t, best, myPreferences);
  let bestCompatibility = buildCompatibilityBreakdown(t, best, myPreferences);
  let bestScore = scoreOf(bestReasons, bestCompatibility);

  for (const candidate of candidates.slice(1)) {
    const reasons = buildMatchReasons(t, candidate, myPreferences);
    const compatibility = buildCompatibilityBreakdown(t, candidate, myPreferences);
    const score = scoreOf(reasons, compatibility);
    if (score > bestScore) {
      best = candidate;
      bestReasons = reasons;
      bestCompatibility = compatibility;
      bestScore = score;
    }
  }

  return { candidate: best, reasons: bestReasons, compatibility: bestCompatibility };
}

function scoreOf(reasons: string[], compatibility: CompatibilityLine[]): number {
  return reasons.length + compatibility.filter((c) => c.strength === "strong").length * 2;
}
