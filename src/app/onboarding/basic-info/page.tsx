import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/components/OnboardingShell";
import { BasicInfoForm } from "@/components/BasicInfoForm";
import { getDictionary } from "@/lib/i18n/server";
import { SIGNUP_INTENT_COOKIE } from "@/lib/signupIntent";

// "I am looking for" (SignupIntentStep, at signup) is a coarser,
// friendlier version of the relation question BasicInfoForm asks in
// more detail below — this just picks a sensible starting point for
// that dropdown; the member sees and can change it immediately, it's
// never submitted as a final answer on its own. "child" can't know
// son vs. daughter yet, so it defaults to "son" rather than leaving
// the dropdown on "self", which would misrepresent who this is for.
function relationDefaultFromLookingFor(lookingFor: string | undefined) {
  if (lookingFor === "self") return "self";
  if (lookingFor === "child") return "son";
  if (lookingFor === "family") return "relative";
  return undefined;
}

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

  // Only relevant for first-time onboarding — an already-complete
  // profile has its own real created_by_relation/priority_focus, and
  // BasicInfoForm hides both questions entirely once isEditing (see
  // its own comment for why).
  let signupIntent: { relationDefault?: string; priorities: string[] } | undefined;
  if (!profile) {
    const store = await cookies();
    const raw = store.get(SIGNUP_INTENT_COOKIE)?.value;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { lookingFor?: string; priorities?: string[] };
        signupIntent = {
          relationDefault: relationDefaultFromLookingFor(parsed.lookingFor),
          priorities: Array.isArray(parsed.priorities) ? parsed.priorities : [],
        };
      } catch {
        // Malformed/tampered cookie — ignore it, same as if it were
        // never set. Nothing here is required.
      }
    }
  }

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
      <BasicInfoForm
        defaults={profile ?? undefined}
        isEditing={isEditing}
        signupIntent={signupIntent}
        t={t}
      />
    </OnboardingShell>
  );
}
