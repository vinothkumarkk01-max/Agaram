"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VALID_PRIORITY_FOCUS } from "@/lib/priorityFocus";
import { SIGNUP_INTENT_COOKIE, VALID_LOOKING_FOR } from "@/lib/signupIntent";

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

export type AuthFormState = {
  error?: string;
} | undefined;

/**
 * Where to send someone after they sign up/log in. Defaults to
 * `/dashboard`, but a form can carry a hidden `next` field (see
 * AuthForm's `next` prop) to come back somewhere more specific — used
 * today by the family-invite flow (`/family/join?code=...`) so
 * accepting an invite doesn't first bounce through the dashboard.
 * Only ever a same-site relative path, and never back to /login or
 * /signup themselves (which would just loop).
 */
function safeNextPath(raw: FormDataEntryValue | null): string {
  const next = String(raw ?? "");
  if (
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/login") &&
    !next.startsWith("/signup")
  ) {
    return next;
  }
  return "/dashboard";
}

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
  redirect("/login");
}
