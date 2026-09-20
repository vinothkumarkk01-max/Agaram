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

export type CompatibilityStrength = "strong" | "good";
export type CompatibilityLine = { label: string; strength: CompatibilityStrength };

/**
 * The categorized "Compatibility" breakdown from PRD §8's match
 * explanation example (Profile / Lifestyle / Location / Family
 * compatibility, each a plain Strong/Good label — never a number).
 * The PRD's own version feeds off a real weighted matching engine and
 * a Jathagam/Porutham score, neither of which exists here — same
 * honesty line buildMatchReasons() above already draws. So every
 * category here is derived only from get_match_candidates()'s now-
 * hard-filtered Phase 30 columns: because a shown candidate already
 * satisfies every preference the viewer actually set, "Strong" vs
 * "Good" isn't measuring whether they're compatible (they already
 * are, or the filter would have excluded them) — it's measuring how
 * much the candidate has POSITIVELY CONFIRMED, as opposed to simply
 * not having filled that optional field in yet. A category with zero
 * confirmed facts is left out entirely rather than shown as "Good" by
 * default — omitting is more honest than implying a match on data
 * that was never actually compared.
 */
export function buildCompatibilityBreakdown(
  t: Dictionary,
  candidate: {
    location: string | null;
    is_verified: boolean;
    has_photo: boolean;
    is_phone_verified: boolean;
    family_type: string | null;
    diet: string | null;
    native_district: string | null;
    community: string | null;
  },
  myPreferences: {
    preferred_locations: string[];
    family_type_preference?: string;
    diet_preference?: string;
    native_district_preference?: string | null;
    community_preference?: string;
  }
): CompatibilityLine[] {
  const lines: CompatibilityLine[] = [];

  // Profile compatibility — plain facts, not preference-gated.
  const profileSignals = [candidate.is_verified, candidate.is_phone_verified, candidate.has_photo].filter(
    Boolean
  ).length;
  if (profileSignals >= 2) {
    lines.push({ label: t.matches.compatibilityProfile, strength: "strong" });
  } else if (profileSignals === 1) {
    lines.push({ label: t.matches.compatibilityProfile, strength: "good" });
  }

  // Location compatibility — every shown candidate already satisfies
  // preferred_locations when it's set, so that case is always Strong;
  // with no location preference stated, a shown candidate is
  // compatible but not specifically sought out, so Good.
  if (myPreferences.preferred_locations?.length) {
    lines.push({ label: t.matches.compatibilityLocation, strength: "strong" });
  } else if (candidate.location) {
    lines.push({ label: t.matches.compatibilityLocation, strength: "good" });
  }

  // Lifestyle compatibility — diet is the only self-description /
  // preference pair available this round (see schema.sql Phase 30).
  const dietPrefSet =
    myPreferences.diet_preference && myPreferences.diet_preference !== "no_preference";
  if (dietPrefSet && candidate.diet) {
    lines.push({ label: t.matches.compatibilityLifestyle, strength: "strong" });
  }

  // Family & cultural preferences — family_type, native_district, and
  // community together (the PRD splits these into separate Family and
  // Cultural tiers, but with only one confirmable signal each this
  // round, they're combined into a single honest count rather than
  // three near-empty categories).
  let confirmed = 0;
  const familyTypePrefSet =
    myPreferences.family_type_preference && myPreferences.family_type_preference !== "no_preference";
  if (familyTypePrefSet && candidate.family_type) confirmed += 1;
  const nativeDistrictPrefSet = Boolean(myPreferences.native_district_preference);
  if (
    nativeDistrictPrefSet &&
    candidate.native_district &&
    candidate.native_district.toLowerCase() === myPreferences.native_district_preference!.toLowerCase()
  ) {
    confirmed += 1;
  }
  const communityPrefSet =
    myPreferences.community_preference && myPreferences.community_preference !== "no_preference";
  if (communityPrefSet && candidate.community) confirmed += 1;

  if (confirmed >= 2) {
    lines.push({ label: t.matches.compatibilityFamily, strength: "strong" });
  } else if (confirmed === 1) {
    lines.push({ label: t.matches.compatibilityFamily, strength: "good" });
  }

  return lines;
}
