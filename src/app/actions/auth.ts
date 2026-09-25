"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VALID_PRIORITY_FOCUS } from "@/lib/priorityFocus";
import { SIGNUP_INTENT_COOKIE, VALID_LOOKING_FOR } from "@/lib/signupIntent";
import { safeNextPath } from "@/lib/safeNextPath";
import { SITE_URL } from "@/lib/site";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// SIGNUP_INTENT_COOKIE carries the answers from SignupIntentStep
// ("who is this for" / "what matters most to you") across the gap
// between account creation here and /onboarding/basic-info, where a
// profiles row actually gets created — there's no profile to attach
// them to yet at signup, so a cookie is the same mechanism the UI
// language toggle already uses (see src/app/actions/locale.ts) for
// state that needs to survive a page load before a place to store it
// durably exists. Set httpOnly below, unlike the locale cookie, since
// nothing client-side needs to read this one back — only basic-info's
// Server Component and its Server Action do. Cleared once it's been
// read into a real profile; see saveBasicInfo() in actions/profile.ts.
//
// Only ever set from the email/password signup path below. The
// Google/Apple fast path (signInWithGoogle/signInWithApple) skips
// SignupIntentStep entirely (Sept 2026 — founder decision: tapping
// Google/Apple should go straight to account creation, not stop for
// two questions first), so it never has answers to save here —
// basic-info's created_by_relation question already covers the same
// ground in more detail and works fine with no default pre-filled.

export type AuthFormState = {
  error?: string;
} | undefined;

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // By IP only (not email, unlike login below) -- signup abuse looks
  // like one source creating many DIFFERENT accounts, not many
  // attempts against one. See lib/rateLimit.ts for the "not
  // configured -> fails open" note.
  const ip = await getClientIp();
  const { limited } = await checkRateLimit("signup-ip", ip);
  if (limited) {
    return {
      error: "Too many accounts created from this connection recently. Please try again later.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // SignupIntentStep's answers, present only when this came from the
  // signup wizard (AuthForm's `signupIntent` prop) — absent for a
  // request this action can't otherwise get here from, so this is
  // never assumed present. See the SIGNUP_INTENT_COOKIE comment above.
  const lookingForRaw = String(formData.get("looking_for") ?? "");
  const prioritiesRaw = String(formData.get("priorities") ?? "");
  if (VALID_LOOKING_FOR.includes(lookingForRaw)) {
    const priorities = prioritiesRaw
      .split(",")
      .map((p) => p.trim())
      .filter((p) => VALID_PRIORITY_FOCUS.includes(p));
    const store = await cookies();
    store.set(
      SIGNUP_INTENT_COOKIE,
      JSON.stringify({ lookingFor: lookingForRaw, priorities }),
      { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true }
    );
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // Two independent checks, not one: by IP (stops one source
  // brute-forcing many accounts) and by email (stops a targeted
  // brute-force against one account spread across many IPs/proxies).
  // Either tripping is enough to block the attempt. See
  // lib/rateLimit.ts for the "not configured -> fails open" note.
  const ip = await getClientIp();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit("login-ip", ip),
    checkRateLimit("login-email", email.toLowerCase()),
  ]);
  if (ipLimit.limited || emailLimit.limited) {
    return { error: "Too many sign-in attempts. Please wait a minute and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  // Sept 2026 — was redirecting to /login; founder feedback: signing
  // out should land back on the public marketing page (the one place
  // in this app reachable either signed in or signed out — see
  // page.tsx's own comment), not straight back at a form asking to
  // sign in again.
  redirect("/");
}

/**
 * Google/Apple sign-in (Sept 2026) — one member-facing account either
 * way: profiles.id is a direct 1:1 key on auth.users.id, and Supabase
 * Auth already supports several providers linked to ONE auth.users row
 * (its own auth.identities table) — this doesn't need a new identity
 * layer, just to call the right API. signInWithOAuth here starts a
 * brand-new sign-in; an already-signed-in member ADDING Google/Apple to
 * their existing account instead uses linkIdentity() from /account (see
 * ConnectedAccounts.tsx), never this.
 *
 * DUPLICATE-ACCOUNT RISK — read before flipping this on in production:
 * if someone signed up with email+password and later taps "Continue
 * with Google" using the same email, whether that lands on their
 * existing account or silently creates a second one is controlled by
 * a Supabase Dashboard setting (Authentication → Providers → "Allow
 * manual linking"/account-linking behavior), not by this file. Confirm
 * that setting before relying on this in the field — app code alone
 * can't guarantee it, and this sandbox has no network path to a real
 * Supabase project to verify it end to end.
 *
 * Both actions redirect the browser to `data.url` (the provider's
 * consent screen); the round trip back through /auth/callback exchanges
 * the code for a session via the SAME cookie-bound server client, which
 * is what makes the PKCE code_verifier Supabase stashes here visible to
 * that route handler.
 */
export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data?.url) {
    redirect(`/login?error=oauth&next=${encodeURIComponent(next)}`);
  }

  redirect(data.url);
}

export async function signInWithApple(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data?.url) {
    redirect(`/login?error=oauth&next=${encodeURIComponent(next)}`);
  }

  redirect(data.url);
}

// ---------------------------------------------------------------
// Self-service password reset (Sept 2026) — the security audit's
// single biggest flagged gap: before this, a member who forgot their
// password had no way back into their account at all. Two actions,
// mirroring the Google/Apple flow above: this one starts it, and
// `updatePassword` (below) finishes it from /reset-password.
//
// IMPORTANT — where the actual email comes from: resetPasswordForEmail
// does NOT go through this app's own Resend integration
// (src/lib/email/resend.ts, used for work-email OTPs and the weekly
// digest). It's Supabase Auth's own "Reset Password" email template,
// sent by whatever mail provider is configured under Supabase
// Dashboard → Authentication → Emails / SMTP Settings. Supabase's
// built-in sender works out of the box but is rate-limited and not
// meant for real production volume — before relying on this in the
// field, set up custom SMTP there (Resend's own SMTP credentials, not
// RESEND_API_KEY, would be one option) and confirm the "Reset
// Password" template's redirect URL setup matches redirectTo below.
// ---------------------------------------------------------------

export type ForgotPasswordFormState =
  | { error?: string; sent?: boolean }
  | undefined;

export async function requestPasswordReset(
  _prevState: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Please enter your email address." };
  }

  const supabase = await createClient();
  // redirectTo lands on the SAME /auth/callback route the OAuth flows
  // use above — it already knows how to exchange a `code` query param
  // for a session and then honor `next`, so a recovery link is just
  // another code exchange landing on /reset-password instead of
  // /dashboard. No new callback route needed.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  // Deliberately NOT branching on "does this email exist" — Supabase
  // itself doesn't leak that (resetPasswordForEmail resolves the same
  // way whether or not the address has an account, precisely to avoid
  // email enumeration), and neither should this action. A real error
  // here is something else: malformed input, or Supabase's own
  // rate-limit on repeated requests for the same address.
  if (error) {
    return { error: error.message };
  }

  return { sent: true };
}

export type ResetPasswordFormState = { error?: string } | undefined;

export async function updatePassword(
  _prevState: ResetPasswordFormState,
  formData: FormData
): Promise<ResetPasswordFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const supabase = await createClient();
  // Only reachable with a real session — either a normal signed-in
  // member changing their password, or (the intended path here) the
  // short-lived session /auth/callback just established from a
  // recovery link's code exchange. No session means the link was
  // never clicked, already used once, or has expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/forgot-password?error=expired");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
