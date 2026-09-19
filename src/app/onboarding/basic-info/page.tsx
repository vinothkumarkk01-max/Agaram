import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/components/OnboardingShell";
import { BasicInfoForm } from "@/components/BasicInfoForm";
import { getDictionary } from "@/lib/i18n/server";

export default async function BasicInfoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getDictionary();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, profile_type, age, location, about_me, created_by_relation")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <OnboardingShell
      stepChip={t.onboarding.stepChipBasicInfo}
      progress={["done", "active", "upcoming"]}
      backHref="/dashboard"
      backLabel={t.common.back}
      brand={t.common.brand}
      eyebrow={t.onboarding.eyebrowAlmostThere}
      title={t.onboarding.basicInfoTitle}
      lede={t.onboarding.basicInfoLede}
    >
      <BasicInfoForm defaults={profile ?? undefined} t={t} />
    </OnboardingShell>
  );
}
