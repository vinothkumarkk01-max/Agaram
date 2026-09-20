"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PhoneActionState = { error?: string; success?: string } | undefined;

/**
 * Submits the candidate's phone number for verification. See the
 * Phase 29 schema comment (supabase/schema.sql) for why this is
 * honestly mocked rather than pretending to send a real SMS OTP:
 * there's no SMS vendor (Twilio/MSG91) connected for this project yet,
 * so — exactly like identity_verifications' Aadhaar mock
 * (actions/verification.ts) — this just records "pending" and
 * PhoneVerificationPending (client component) triggers the mock
 * resolver below a couple of seconds later.
 */
export async function submitPhoneVerification(
  _prevState: PhoneActionState,
  formData: FormData
): Promise<PhoneActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const consent = formData.get("consent");
  const phoneDigits = String(formData.get("phone_number") ?? "").replace(/[^\d+]/g, "");

  if (consent !== "on") {
    return { error: "Please confirm consent to verify this phone number." };
  }
  if (!/^\+?\d{10,15}$/.test(phoneDigits)) {
    return {
      error: "Enter a valid phone number, digits only (include the country code if outside India).",
    };
  }

  const { error } = await supabase.from("phone_verifications").upsert({
    profile_id: user.id,
    status: "pending",
    provider: "mock",
    phone_number: phoneDigits,
    submitted_at: new Date().toISOString(),
    verified_at: null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: "Verifying…" };
}

/**
 * MOCK VENDOR RESULT for phone verification — stands in for an SMS
 * provider's async delivery + code confirmation. Always resolves to
 * "verified" after PhoneVerificationPending's short simulated delay.
 *
 * TO GO LIVE: once a real SMS OTP vendor is connected, replace this
 * with the real send-and-check flow (mirroring
 * confirm_work_email_otp() in actions/employment.ts, which already
 * does this for real over email). Nothing else needs to change — every
 * reader only ever looks at phone_verifications.status.
 *
 * Calls resolve_mock_phone_verification() (SECURITY DEFINER,
 * supabase/schema.sql Phase 29) rather than updating the row directly,
 * same reasoning as resolveMockVerification() for identity_verifications:
 * the RLS policy on this table only ever lets a member write their own
 * status back to "pending".
 */
export async function resolveMockPhoneVerification() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("resolve_mock_phone_verification");

  revalidatePath("/account");
}
