"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  error?: string;
  success?: string;
} | undefined;

function splitList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveBasicInfo(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const profileType = String(formData.get("profile_type") ?? "");
  const ageRaw = String(formData.get("age") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const aboutMe = String(formData.get("about_me") ?? "").trim();
  const termsAccepted = formData.get("terms_accepted");
  const createdByRelationRaw = String(formData.get("created_by_relation") ?? "self");
  const validRelations = ["self", "son", "daughter", "brother", "sister", "friend", "relative"];
  const createdByRelation = validRelations.includes(createdByRelationRaw)
    ? createdByRelationRaw
    : "self";

  if (!fullName) {
    return { error: "Please enter your full name." };
  }
  if (profileType !== "groom" && profileType !== "bride") {
    return { error: "Please choose whether you are a groom or bride." };
  }
  const age = Number(ageRaw);
  if (!Number.isInteger(age) || age < 18 || age > 100) {
    return { error: "Please enter a valid age between 18 and 100." };
  }
  if (!location) {
    return { error: "Please enter your city — matches are filtered by location." };
  }
  if (termsAccepted !== "on") {
    return { error: "Please confirm you agree to the Privacy Policy to continue." };
  }

  // terms_accepted_at (Phase 17, supabase/schema.sql) — the DPDP-Act
  // consent capture Section 7 of /privacy has always described. This
  // form only runs once, as the very first onboarding step, so
  // setting it unconditionally on every submit (rather than only if
  // it isn't already set) is fine — there's no "re-editing basic info
  // later" path that reuses saveBasicInfo.
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    profile_type: profileType,
    age,
    location,
    about_me: aboutMe || null,
    created_by_relation: createdByRelation,
    terms_accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/onboarding/preferences");
}

export async function savePreferences(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const ageMinRaw = String(formData.get("age_min") ?? "");
  const ageMaxRaw = String(formData.get("age_max") ?? "");
  const educationLevel = String(formData.get("education_level") ?? "");
  const openToRelocating = String(formData.get("open_to_relocating") ?? "");
  const professionField = String(formData.get("profession_field") ?? "").trim();
  const preferredLocations = splitList(formData.get("preferred_locations"));
  const languages = splitList(formData.get("languages"));

  const ageMin = Number(ageMinRaw);
  const ageMax = Number(ageMaxRaw);

  if (!Number.isInteger(ageMin) || ageMin < 18) {
    return { error: "Please enter a valid minimum age (18 or older)." };
  }
  if (!Number.isInteger(ageMax) || ageMax < ageMin) {
    return { error: "Maximum age must be greater than or equal to minimum age." };
  }
  if (educationLevel !== "bachelors_plus" && educationLevel !== "any") {
    return { error: "Please choose an education level." };
  }
  if (!["yes", "maybe", "no"].includes(openToRelocating)) {
    return { error: "Please choose whether you're open to relocating." };
  }

  const { error } = await supabase.from("preferences").upsert({
    profile_id: user.id,
    age_min: ageMin,
    age_max: ageMax,
    preferred_locations: preferredLocations,
    education_level: educationLevel,
    profession_field: professionField || null,
    open_to_relocating: openToRelocating,
    languages,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/onboarding/verification");
}

const FAMILY_TYPE_VALUES = ["nuclear", "joint"];
const DIET_VALUES = ["vegetarian", "non_vegetarian"];

function optionalEnum(value: FormDataEntryValue | null, allowed: string[]): string | null {
  const s = String(value ?? "").trim();
  return allowed.includes(s) ? s : null;
}

/**
 * Extended preferences, Phase 25 (supabase/schema.sql) — the PRD's
 * "family / lifestyle / cultural" tiers, deliberately optional and
 * editable any time from /account rather than gating onboarding.
 * `saveBackgroundInfo` is the self-description half ("who I am");
 * `saveExtendedPreferences` below is the "who I want" half. Kept as
 * two separate actions/forms on purpose, mirroring the two separate
 * database tables (profiles vs preferences) they write to.
 */
export async function saveBackgroundInfo(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const familyType = optionalEnum(formData.get("family_type"), FAMILY_TYPE_VALUES);
  const diet = optionalEnum(formData.get("diet"), DIET_VALUES);
  const nativeDistrict = String(formData.get("native_district") ?? "").trim();
  const community = String(formData.get("community") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      family_type: familyType,
      diet,
      native_district: nativeDistrict || null,
      community: community || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: "Saved." };
}

const NO_PREFERENCE = "no_preference";
const FAMILY_TYPE_PREF_VALUES = [...FAMILY_TYPE_VALUES, NO_PREFERENCE];
const FAMILY_INVOLVEMENT_VALUES = ["low", "medium", "high", NO_PREFERENCE];
const DIET_PREF_VALUES = [...DIET_VALUES, NO_PREFERENCE];
const DRINKING_VALUES = ["yes", "no", "occasionally", NO_PREFERENCE];
const SMOKING_VALUES = ["yes", "no", NO_PREFERENCE];
const RELIGIOUS_PRACTICE_VALUES = ["important", NO_PREFERENCE];

function enumOrNoPreference(value: FormDataEntryValue | null, allowed: string[]): string {
  const s = String(value ?? NO_PREFERENCE).trim();
  return allowed.includes(s) ? s : NO_PREFERENCE;
}

export async function saveExtendedPreferences(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nativeDistrictPreference = String(formData.get("native_district_preference") ?? "").trim();
  // Deliberately not validated against a fixed list of communities —
  // same reasoning as profiles.community: an open text field, never a
  // dropdown that would imply Agaram maintains an official list.
  const communityPreference = String(formData.get("community_preference") ?? "").trim() || NO_PREFERENCE;

  const { error } = await supabase
    .from("preferences")
    .update({
      family_type_preference: enumOrNoPreference(
        formData.get("family_type_preference"),
        FAMILY_TYPE_PREF_VALUES
      ),
      family_involvement_preference: enumOrNoPreference(
        formData.get("family_involvement_preference"),
        FAMILY_INVOLVEMENT_VALUES
      ),
      diet_preference: enumOrNoPreference(formData.get("diet_preference"), DIET_PREF_VALUES),
      drinking_preference: enumOrNoPreference(formData.get("drinking_preference"), DRINKING_VALUES),
      smoking_preference: enumOrNoPreference(formData.get("smoking_preference"), SMOKING_VALUES),
      native_district_preference: nativeDistrictPreference || null,
      community_preference: communityPreference,
      religious_practice_preference: enumOrNoPreference(
        formData.get("religious_practice_preference"),
        RELIGIOUS_PRACTICE_VALUES
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: "Saved." };
}
