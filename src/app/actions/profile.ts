"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  error?: string;
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
