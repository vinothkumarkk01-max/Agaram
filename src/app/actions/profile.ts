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
  const aboutMe = String(formData.get("about_me") ?? "").trim();

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

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    profile_type: profileType,
    age,
    about_me: aboutMe || null,
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
