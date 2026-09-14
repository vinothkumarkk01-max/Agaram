"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type VerificationFormState = {
  error?: string;
} | undefined;

/**
 * Submits the candidate's identity-verification consent + Aadhaar
 * number. Only the last 4 digits are ever stored (see
 * supabase/schema.sql) — the full number is used for this one request
 * and then discarded.
 *
 * NOTE — MOCK VENDOR INTEGRATION: real Aadhaar e-KYC verification
 * requires a HyperVerge (or Signzy) sandbox account, which Agaram
 * doesn't have yet. Until sandbox credentials arrive, this marks the
 * row "pending" and `resolveMockVerification` below stands in for the
 * vendor's async result. Swap that one function's body for the real
 * API call once credentials arrive — nothing else in this flow (this
 * form, the status page, the dashboard badge) needs to change, since
 * they all just read `identity_verifications.status`.
 */
export async function submitIdentityVerification(
  _prevState: VerificationFormState,
  formData: FormData
): Promise<VerificationFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const consent = formData.get("consent");
  const aadhaarDigits = String(formData.get("aadhaar_number") ?? "").replace(
    /\D/g,
    ""
  );

  if (consent !== "on") {
    return { error: "Please confirm consent to run the identity check." };
  }
  if (aadhaarDigits.length !== 12) {
    return { error: "Please enter a valid 12-digit Aadhaar number." };
  }

  const { error } = await supabase.from("identity_verifications").upsert({
    profile_id: user.id,
    status: "pending",
    method: "aadhaar",
    provider: "mock",
    aadhaar_last4: aadhaarDigits.slice(-4),
    submitted_at: new Date().toISOString(),
    verified_at: null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/onboarding/verification");
}

/**
 * MOCK VENDOR RESULT — stands in for HyperVerge's async webhook
 * callback. Always resolves to "verified" after a short simulated
 * delay (triggered from src/components/VerificationPending.tsx).
 *
 * TO GO LIVE: once real HyperVerge sandbox credentials + API docs are
 * available, replace the body below with the real result-handling
 * call (or a webhook route that updates this same row). Everything
 * downstream only ever reads `identity_verifications.status`, so no
 * other file needs to change.
 */
export async function resolveMockVerification() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("identity_verifications")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", user.id);

  redirect("/onboarding/verification");
}
