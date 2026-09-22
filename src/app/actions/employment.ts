"use server";

import { createHash, randomInt } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";

const OTP_TTL_MINUTES = 10;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  // A cryptographically random 6-digit code, zero-padded — randomInt
  // is Node's CSPRNG-backed integer generator, not Math.random().
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export type EmploymentActionState = { error?: string; success?: string } | undefined;

/**
 * Starts the work-email verification path: generates a 6-digit code,
 * stores only its sha256 hash (see supabase/schema.sql, Phase 18 —
 * confirm_work_email_otp() checks the hash server-side), and emails
 * the plain code to the claimed work address via Resend. The row is
 * upserted with status "pending" every time, which the RLS policy on
 * employment_verifications allows from the member's own session — the
 * hash itself is not something the client ever needs to see or set.
 */
export async function requestWorkEmailOtp(
  _prevState: EmploymentActionState,
  formData: FormData
): Promise<EmploymentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workEmail = String(formData.get("work_email") ?? "")
    .trim()
    .toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(workEmail)) {
    return { error: "Enter a valid work email address." };
  }

  const code = generateCode();
  const { error } = await supabase.from("employment_verifications").upsert({
    profile_id: user.id,
    method: "work_email",
    status: "pending",
    work_email: workEmail,
    otp_code_hash: hashCode(code),
    otp_expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
    otp_attempts: 0,
    submitted_at: new Date().toISOString(),
    verified_at: null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  const result = await sendEmail({
    to: workEmail,
    subject: "Your Agaramiya work email verification code",
    text: `Your verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your verification code is <strong style="font-size:20px;letter-spacing:2px;">${code}</strong>.</p><p>It expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`,
  });

  if (!result.sent) {
    if (result.reason === "not_configured") {
      return {
        error:
          "Email sending isn't configured yet — add RESEND_API_KEY and RESEND_FROM_ADDRESS to your environment variables (see README).",
      };
    }
    return { error: "Couldn't send the verification email — please try again." };
  }

  revalidatePath("/account");
  return { success: `Code sent to ${workEmail}. Enter it below — it expires in ${OTP_TTL_MINUTES} minutes.` };
}

/**
 * Confirms the code the member typed back in. All of the actual
 * checking (hash match, expiry, attempt limit) happens inside
 * confirm_work_email_otp() (SECURITY DEFINER, supabase/schema.sql) —
 * this action just calls it and translates the boolean result into a
 * message, since the RPC itself is the security boundary, not this
 * server action.
 */
export async function confirmWorkEmailOtp(
  _prevState: EmploymentActionState,
  formData: FormData
): Promise<EmploymentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { error: "Enter the 6-digit code from your email." };
  }

  const { data: confirmed, error } = await supabase.rpc("confirm_work_email_otp", {
    p_code: code,
  });

  if (error) {
    return { error: error.message };
  }
  if (!confirmed) {
    return { error: "That code is incorrect or has expired. Request a new one below." };
  }

  revalidatePath("/account");
  return { success: "Work email verified." };
}

/**
 * The "ask your employer" path (PRD §7.1.3). No vendor is wired in
 * (see the schema comment) — this records consent and the employer's
 * contact details and leaves the row "pending" for an admin to review
 * from /admin/employment, exactly like identity verification's mock
 * review today. A plain upsert is safe here (no RPC needed) because
 * the RLS WITH CHECK on employment_verifications already pins every
 * client-side write to status "pending".
 */
export async function submitEmployerAttestation(
  _prevState: EmploymentActionState,
  formData: FormData
): Promise<EmploymentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const employerName = String(formData.get("employer_name") ?? "").trim();
  const contactEmail = String(formData.get("employer_contact_email") ?? "")
    .trim()
    .toLowerCase();
  const consent = formData.get("consent");

  if (!employerName) {
    return { error: "Enter your employer's name." };
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(contactEmail)) {
    return { error: "Enter a valid contact email for your employer (e.g. your HR team)." };
  }
  if (consent !== "on") {
    return { error: "Please confirm consent to send this request." };
  }

  const { error } = await supabase.from("employment_verifications").upsert({
    profile_id: user.id,
    method: "employer_attestation",
    status: "pending",
    employer_name: employerName,
    employer_contact_email: contactEmail,
    consent_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
    verified_at: null,
    admin_note: null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  return { success: "Request recorded — we'll follow up with your employer and update your badge once there's a result." };
}
