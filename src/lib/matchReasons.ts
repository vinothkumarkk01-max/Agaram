import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * PRD §8 calls a "why we introduced you" explanation a Phase 1
 * must-have, with an explicit warning not to lead with a single
 * score. The PRD's own version is a weighted multi-factor model
 * (Jathagam, education/professional tier, lifestyle answers, and so
 * on) feeding a real matching ENGINE — none of that exists in this
 * app; Browse is a simple hard-filter query (see
 * get_match_candidates() in supabase/schema.sql). Building a fake
 * weighted score on top of a hard-filter query would be presenting
 * invented precision the underlying system doesn't have — the same
 * line already drawn for Jathagam compatibility (README, "Jathagam
 * / horoscope details").
 *
 * So this is the honest version: every line here is a plain
 * statement of something that is LITERALLY true about this
 * candidate, computed from data the viewer already has (their own
 * preferences, and the same masked fields Browse already shows) —
 * never a score, a ranking, or a weighted combination. If nothing
 * else applies, "within your age range" always does, since
 * get_match_candidates() only ever returns candidates that already
 * satisfy that filter.
 */
export function buildMatchReasons(
  t: Dictionary,
  candidate: { location: string | null; is_verified: boolean; has_photo: boolean },
  myPreferences: { age_min: number; age_max: number; preferred_locations: string[] }
): string[] {
  const reasons: string[] = [];

  reasons.push(
    `${t.matches.reasonAgeRangePrefix}${myPreferences.age_min}–${myPreferences.age_max}${t.matches.reasonAgeRangeSuffix}`
  );

  const inPreferredLocation =
    candidate.location &&
    myPreferences.preferred_locations.some(
      (loc) => loc.toLowerCase() === candidate.location!.toLowerCase()
    );

  if (inPreferredLocation) {
    reasons.push(`${t.matches.reasonPreferredLocationPrefix}${candidate.location}`);
  } else if (candidate.location) {
    reasons.push(`${t.matches.reasonLocationPrefix}${candidate.location}`);
  }

  if (candidate.is_verified) {
    reasons.push(t.matches.reasonVerified);
  }

  if (candidate.has_photo) {
    reasons.push(t.matches.reasonHasPhoto);
  }

  return reasons;
}
