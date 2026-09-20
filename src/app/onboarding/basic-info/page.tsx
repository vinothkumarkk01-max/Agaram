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

  // Reached two ways: first-time onboarding (no profile yet) and
  // "Edit profile" from the dashboard, for someone who's already
  // fully set up. The two deserve different chrome — per customer
  // feedback (Sept 2026), showing an "Almost there / Day 1 Step 2 of
  // 3" onboarding step (with its progress bar and step chip) to a
  // returning member editing their name is both confusing and adds
  // scroll height this screen doesn't need for that case.
  const isEditing = Boolean(profile);

  return (
    <OnboardingShell
      stepChip={isEditing ? undefined : t.onboarding.stepChipBasicInfo}
      progress={isEditing ? undefined : ["done", "active", "upcoming"]}
      backHref="/dashboard"
      backLabel={t.common.backDashboard}
      brand={t.common.brand}
      eyebrow={isEditing ? t.onboarding.eyebrowEditProfile : t.onboarding.eyebrowAlmostThere}
      title={isEditing ? t.onboarding.editProfileTitle : t.onboarding.basicInfoTitle}
      lede={isEditing ? t.onboarding.editProfileLede : t.onboarding.basicInfoLede}
    >
      <BasicInfoForm defaults={profile ?? undefined} isEditing={isEditing} t={t} />
    </OnboardingShell>
  );
}
