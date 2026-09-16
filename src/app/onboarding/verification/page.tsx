import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/components/OnboardingShell";
import { IdentityVerificationForm } from "@/components/IdentityVerificationForm";
import { VerificationPending } from "@/components/VerificationPending";
import { getDictionary } from "@/lib/i18n/server";

export default async function VerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getDictionary();

  const { data: verification } = user
    ? await supabase
        .from("identity_verifications")
        .select("status, aadhaar_last4")
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  if (verification?.status === "verified") {
    return (
      <OnboardingShell
        stepChip={t.onboarding.stepChipIdentity}
        progress={["done"]}
        backHref="/dashboard"
        backLabel={t.common.back}
        brand={t.common.brand}
        eyebrow={t.onboarding.eyebrowAllSet}
        title={t.onboarding.verifiedTitle}
        lede={t.onboarding.verifiedLede}
      >
        <div
          className="rounded-2xl p-5 mb-6 text-sm font-semibold"
          style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
        >
          {t.onboarding.verifiedViaAadhaarBase}
          {verification.aadhaar_last4
            ? `${t.onboarding.verifiedViaAadhaarEndingPrefix}${verification.aadhaar_last4}${t.onboarding.verifiedViaAadhaarEndingSuffix}`
            : ""}
          .
        </div>
        <Link
          href="/dashboard"
          className="block text-center rounded-xl py-3.5 font-bold text-white text-sm"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          {t.onboarding.goToDashboard}
        </Link>
      </OnboardingShell>
    );
  }

  if (verification?.status === "pending") {
    return (
      <OnboardingShell
        stepChip={t.onboarding.stepChipIdentity}
        progress={["active"]}
        backHref="/dashboard"
        backLabel={t.common.back}
        brand={t.common.brand}
        eyebrow={t.onboarding.eyebrowAlmostThere}
        title={t.onboarding.pendingTitle}
        lede={t.onboarding.pendingLede}
      >
        <VerificationPending t={t} />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      stepChip={t.onboarding.stepChipIdentity}
      progress={["upcoming"]}
      backHref="/dashboard"
      backLabel={t.common.back}
      brand={t.common.brand}
      eyebrow={t.onboarding.eyebrowBuildTrust}
      title={t.onboarding.unverifiedTitle}
      lede={t.onboarding.unverifiedLede}
    >
      <IdentityVerificationForm t={t} />
    </OnboardingShell>
  );
}
