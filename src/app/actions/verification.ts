"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRIVACY_POLICY_VERSION } from "@/lib/consent";

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
 * requires a HyperVerge (or Signzy) sandbox account, which Agaramiya
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

  // consent_at/consent_version (Phase 33, supabase/schema.sql) record
  // the moment consent was actually given, separately from
  // submitted_at -- before this, the two were conflated, which a
  // security audit flagged as a real gap given Aadhaar is the more
  // sensitive of the two verification checks. Both are re-stamped on
  // every resubmission (this upsert runs again if a member retries),
  // which is correct: a resubmission is a fresh consent event.
  const now = new Date().toISOString();
  const { error } = await supabase.from("identity_verifications").upsert({
    profile_id: user.id,
    status: "pending",
    method: "aadhaar",
    provider: "mock",
    aadhaar_last4: aadhaarDigits.slice(-4),
    submitted_at: now,
    consent_at: now,
    consent_version: PRIVACY_POLICY_VERSION,
    verified_at: null,
    updated_at: now,
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
 *
 * Calls the resolve_mock_verification() SECURITY DEFINER function
 * (supabase/schema.sql, Phase 8) instead of updating the row directly
 * — the RLS policy on this table only ever lets a member write their
 * own status back to "pending", so a plain .update({status:
 * "verified"}) from here would silently fail after Phase 8's security
 * pass. The RPC is the one path allowed to actually mark a row
 * verified.
 */
export async function resolveMockVerification() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase.rpc("resolve_mock_verification");

  redirect("/onboarding/verification");
}
