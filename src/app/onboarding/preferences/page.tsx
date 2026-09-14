import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/components/OnboardingShell";
import { PreferencesForm } from "@/components/PreferencesForm";

export default async function PreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: preferences } = user
    ? await supabase
        .from("preferences")
        .select(
          "age_min, age_max, preferred_locations, education_level, profession_field, open_to_relocating, languages"
        )
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <OnboardingShell
      stepChip="Day 1 · Step 3 of 3"
      progress={["done", "done", "active"]}
      backHref="/onboarding/basic-info"
      eyebrow="Almost there"
      title="Who are you looking for?"
      lede="Distinct from who you are — these are your must-haves for a match."
      colWidth={640}
    >
      <PreferencesForm defaults={preferences ?? undefined} />
    </OnboardingShell>
  );
}
