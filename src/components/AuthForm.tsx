"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/actions/auth";
import { signInWithGoogle, signInWithApple } from "@/app/actions/auth";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locale";
import { LocaleToggle } from "@/components/LocaleToggle";
import { BrandMark } from "@/components/BrandMark";
import { OAuthButtons } from "@/components/OAuthButtons";

type Props = {
  mode: "login" | "signup";
  action: (
    state: AuthFormState,
    formData: FormData
  ) => Promise<AuthFormState>;
  locale: Locale;
  t: Dictionary;
  /** Where to redirect after a successful signup/login, instead of the
   *  default `/dashboard` — carried through as a hidden field and
   *  preserved across the login/signup switch link. See auth.ts's
   *  `safeNextPath`. */
  next?: string;
  /** Signup only — the answers from SignupIntentStep, the screen
   *  shown before this one in SignupWizard.tsx. Carried through as
   *  hidden fields so the `signup` action (actions/auth.ts) can save
   *  them as a cookie for /onboarding/basic-info to read. Never set
   *  by the login page, which renders this form directly. */
  signupIntent?: { lookingFor: string; priorities: string[] };
  /** Signup only — shows a small back link above the title that
   *  returns to SignupIntentStep instead of submitting anything.
   *  Omitted (as on the login page) renders nothing here. */
  onBack?: () => void;
  backLabel?: string;
  /** Login page only — set when `/auth/callback` (or a Google/Apple
   *  sign-in action) bounced back with `?error=oauth`. Not modeled as
   *  `state.error` because it arrives via a redirect query param, not
   *  the login action's own state, so both are checked below. */
  oauthError?: boolean;
  /** Default true. SignupWizard's step 2 (email/password, reached only
   *  by someone who already answered SignupIntentStep and tapped
   *  Continue — i.e. explicitly chose the manual path) sets this
   *  false. Sept 2026 founder feedback: showing "Continue with
   *  Google/Apple" a SECOND time here read as an inconsistent,
   *  mismatched flow — the "or" divider on the intent screen leads to
   *  questions, not a form, so repeating the same OAuth-then-or
   *  pattern here implied something it doesn't deliver. It was also a
   *  real trap: tapping Google/Apple from this screen starts a fresh
   *  OAuth sign-in that carries no memory of the answers just given
   *  (see signInWithGoogle/signInWithApple and the SIGNUP_INTENT_COOKIE
   *  comment in actions/auth.ts — that cookie is only ever set by the
   *  email/password `signup` action below), so those answers would be
   *  silently lost. The login page never passes this, so it keeps
   *  showing OAuth as its primary, first-class entry point. */
  showOAuth?: boolean;
};

export function AuthForm({
  mode,
  action,
  locale,
  t,
  next,
  signupIntent,
  onBack,
  backLabel,
  oauthError,
  showOAuth = true,
}: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isSignup = mode === "signup";
  const switchHref = `${isSignup ? "/login" : "/signup"}${
    next ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-8">
          <BrandMark size={40} />
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: "var(--text-soft)" }}
          >
            {t.common.brand}
          </span>
        </div>

        <div
          className="rounded-2xl p-8 shadow-sm"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold mb-3"
              style={{ color: "var(--text-soft)" }}
            >
              {backLabel}
            </button>
          )}
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            {isSignup ? t.auth.createTitle : t.auth.welcomeBack}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
            {isSignup ? t.auth.createSubtitle : t.auth.loginSubtitle}
          </p>

          {oauthError && (
            <p className="text-sm mb-4" style={{ color: "var(--accent-strong)" }}>
              {t.auth.oauthErrorMessage}
            </p>
          )}

          {showOAuth && (
            <>
              <OAuthButtons
                t={t}
                next={next}
                googleAction={signInWithGoogle}
                appleAction={signInWithApple}
              />

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
                <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                  {t.auth.orDivider}
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
              </div>
            </>
          )}

          <form action={formAction} className="flex flex-col gap-4">
            {next && <input type="hidden" name="next" value={next} />}
            {signupIntent && (
              <>
                <input type="hidden" name="looking_for" value={signupIntent.lookingFor} />
                <input type="hidden" name="priorities" value={signupIntent.priorities.join(",")} />
              </>
            )}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-soft)" }}
              >
                {t.auth.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold"
                  style={{ color: "var(--text-soft)" }}
                >
                  {t.auth.password}
                </label>
                {/* Login only — a signup form has no existing password
                    to have forgotten yet. */}
                {!isSignup && (
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold"
                    style={{ color: "var(--accent-strong)" }}
                  >
                    {t.auth.forgotPasswordLink}
                  </Link>
                )}
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                }}
                placeholder={t.auth.passwordPlaceholder}
              />
            </div>

            {state?.error && (
              <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl py-3 font-bold text-white text-sm mt-1 disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              {pending
                ? t.auth.pleaseWait
                : isSignup
                  ? t.auth.createAccountBtn
                  : t.auth.signInBtn}
            </button>
          </form>

          <p
            className="text-center text-xs mt-6"
            style={{ color: "var(--text-soft)" }}
          >
            {isSignup ? (
              <>
                {t.auth.alreadyHaveAccount}{" "}
                <Link href={switchHref} className="font-semibold" style={{ color: "var(--accent-strong)" }}>
                  {t.auth.signInLink}
                </Link>
              </>
            ) : (
              <>
                {t.auth.newToAgaram}{" "}
                <Link href={switchHref} className="font-semibold" style={{ color: "var(--accent-strong)" }}>
                  {t.auth.createAnAccount}
                </Link>
              </>
            )}
          </p>
          {isSignup && (
            <p
              className="text-center text-xs mt-3"
              style={{ color: "var(--text-soft)" }}
            >
              {t.auth.agreeToPolicyPrefix}
              <Link href="/privacy" className="underline">
                {t.common.privacyPolicy}
              </Link>
              {t.auth.agreeToPolicySuffix}
            </p>
          )}
        </div>

        <div className="flex justify-center mt-6">
          <LocaleToggle locale={locale} />
        </div>
      </div>
    </div>
  );
}
