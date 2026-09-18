"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/actions/auth";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locale";
import { LocaleToggle } from "@/components/LocaleToggle";

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
};

export function AuthForm({ mode, action, locale, t, next }: Props) {
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
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            அ
          </div>
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
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            {isSignup ? t.auth.createTitle : t.auth.welcomeBack}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
            {isSignup ? t.auth.createSubtitle : t.auth.loginSubtitle}
          </p>

          <form action={formAction} className="flex flex-col gap-4">
            {next && <input type="hidden" name="next" value={next} />}
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
              <label
                htmlFor="password"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-soft)" }}
              >
                {t.auth.password}
              </label>
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
