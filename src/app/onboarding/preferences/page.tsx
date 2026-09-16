import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/components/OnboardingShell";
import { PreferencesForm } from "@/components/PreferencesForm";
import { getDictionary } from "@/lib/i18n/server";

export default async function PreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getDictionary();

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
      stepChip={t.onboarding.stepChipPreferences}
      progress={["done", "done", "active"]}
      backHref="/onboarding/basic-info"
      backLabel={t.common.back}
      brand={t.common.brand}
      eyebrow={t.onboarding.eyebrowAlmostThere}
      title={t.onboarding.preferencesTitle}
      lede={t.onboarding.preferencesLede}
      colWidth={640}
    >
      <PreferencesForm defaults={preferences ?? undefined} t={t} />
    </OnboardingShell>
  );
}
