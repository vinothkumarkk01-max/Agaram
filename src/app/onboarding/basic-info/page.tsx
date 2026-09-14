import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/components/OnboardingShell";
import { BasicInfoForm } from "@/components/BasicInfoForm";

export default async function BasicInfoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, profile_type, age, about_me")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <OnboardingShell
      stepChip="Day 1 · Step 2 of 3"
      progress={["done", "active", "upcoming"]}
      backHref="/dashboard"
      eyebrow="Almost there"
      title="Tell us about yourself."
      lede="A few basics so matches know who they're meeting. Who you're looking for comes next — this is just about you."
    >
      <BasicInfoForm defaults={profile ?? undefined} />
    </OnboardingShell>
  );
}
