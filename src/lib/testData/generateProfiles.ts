import {
  MALE_FIRST_NAMES,
  FEMALE_FIRST_NAMES,
  SECOND_NAMES,
  LOCATIONS,
  NATIVE_DISTRICTS,
  ABOUT_ME_LINES,
  pick,
  mulberry32,
} from "./pools";

export type GeneratedProfile = {
  slug: string; // e.g. "bride-037" — used for the email and storage path seed
  full_name: string;
  profile_type: "bride" | "groom";
  age: number;
  location: string;
  about_me: string;
  family_type: "nuclear" | "joint";
  diet: "vegetarian" | "non_vegetarian";
  native_district: string | null;
  is_phone_verified: boolean;
  identity_status: "verified" | "pending" | "none";
};

/**
 * Deterministic — the same (profileType, index) always produces the
 * same profile, so re-running the bulk-seed route with the same
 * offset/count is idempotent, matching the existing single-batch
 * seed route's own "safe to call more than once" property.
 */
export function generateProfile(
  profileType: "bride" | "groom",
  index: number
): GeneratedProfile {
  // Distinct RNG streams per gender (different seed base) so bride #7
  // and groom #7 don't land on mirrored picks.
  const seedBase = profileType === "bride" ? 90210 : 12345;
  const rng = mulberry32(seedBase + index * 97);

  const firstPool = profileType === "bride" ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;

  // first name cycles through its pool directly (never repeats within
  // 0..49, then cycles) while the second name is offset by a
  // coprime-ish stride so the (first, second) PAIR stays unique across
  // the full 0..99 range used by this generator.
  const firstName = pick(firstPool, index);
  const secondName = pick(SECOND_NAMES, index * 13 + 5);
  const full_name = `${firstName} ${secondName}`;

  const age =
    profileType === "bride"
      ? 21 + Math.floor(rng() * 14) // 21–34
      : 24 + Math.floor(rng() * 15); // 24–38

  const location = pick(LOCATIONS, Math.floor(rng() * LOCATIONS.length) + index);
  const about_me = pick(ABOUT_ME_LINES, Math.floor(rng() * ABOUT_ME_LINES.length) + index);
  const family_type: GeneratedProfile["family_type"] = rng() < 0.55 ? "nuclear" : "joint";
  const diet: GeneratedProfile["diet"] = rng() < 0.6 ? "vegetarian" : "non_vegetarian";

  // ~30% leave this optional field blank, same as a real member who
  // hasn't filled in Extended Preferences yet — gives the account
  // page's "Not added" badge something real to show on some profiles.
  const native_district =
    rng() < 0.7 ? pick(NATIVE_DISTRICTS, Math.floor(rng() * NATIVE_DISTRICTS.length) + index) : null;

  const is_phone_verified = rng() < 0.5;

  const identityRoll = rng();
  const identity_status: GeneratedProfile["identity_status"] =
    identityRoll < 0.7 ? "verified" : identityRoll < 0.9 ? "pending" : "none";

  return {
    slug: `${profileType}-${String(index).padStart(3, "0")}`,
    full_name,
    profile_type: profileType,
    age,
    location,
    about_me,
    family_type,
    diet,
    native_district,
    is_phone_verified,
    identity_status,
  };
}

export function generateProfiles(
  profileType: "bride" | "groom",
  offset: number,
  count: number,
  total: number
): GeneratedProfile[] {
  const end = Math.min(offset + count, total);
  const out: GeneratedProfile[] = [];
  for (let i = offset; i < end; i++) {
    out.push(generateProfile(profileType, i));
  }
  return out;
}
