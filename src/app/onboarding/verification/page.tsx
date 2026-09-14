import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/components/OnboardingShell";
import { IdentityVerificationForm } from "@/components/IdentityVerificationForm";
import { VerificationPending } from "@/components/VerificationPending";

export default async function VerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        stepChip="Identity check"
        progress={["done"]}
        backHref="/dashboard"
        eyebrow="All set"
        title="Your identity is verified."
        lede="Members see this as a Verified badge on your profile — it's one of the first things that builds trust."
      >
        <div
          className="rounded-2xl p-5 mb-6 text-sm font-semibold"
          style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
        >
          Verified via Aadhaar
          {verification.aadhaar_last4
            ? ` ending ${verification.aadhaar_last4}`
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
          Go to your dashboard
        </Link>
      </OnboardingShell>
    );
  }

  if (verification?.status === "pending") {
    return (
      <OnboardingShell
        stepChip="Identity check"
        progress={["active"]}
        backHref="/dashboard"
        eyebrow="Almost there"
        title="Verifying your identity…"
        lede="This usually takes a few seconds. Don't close this tab."
      >
        <VerificationPending />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      stepChip="Identity check"
      progress={["upcoming"]}
      backHref="/dashboard"
      eyebrow="Build trust"
      title="Verify your identity."
      lede="A quick Aadhaar check adds a Verified badge to your profile — members trust verified profiles more."
    >
      <IdentityVerificationForm />
    </OnboardingShell>
  );
}
