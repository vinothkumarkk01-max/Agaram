"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locale";
import { LocaleToggle } from "@/components/LocaleToggle";
import { BrandMark } from "@/components/BrandMark";

type Props = {
  locale: Locale;
  t: Dictionary;
  /** Set when redirected here from updatePassword (actions/auth.ts)
   *  after landing on /reset-password with no session — the recovery
   *  link was expired, already used, or never valid. */
  expired?: boolean;
};

/**
 * /forgot-password — step one of self-service password reset (Sept
 * 2026, see requestPasswordReset in actions/auth.ts). Same card chrome
 * as AuthForm so this doesn't feel like a bolted-on utility screen,
 * but its own component rather than a third AuthForm mode — the
 * fields, submit state, and success view are different enough
 * (no password field, and a "check your email" end state instead of a
 * redirect) that forcing it into AuthForm's shape would've meant more
 * conditionals there than this file is long.
 */
export function ForgotPasswordForm({ locale, t, expired }: Props) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    undefined
  );

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
          {state?.sent ? (
            <>
              <h1
                className="text-2xl mb-1"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
              >
                {t.auth.resetEmailSentTitle}
              </h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
                {t.auth.resetEmailSentBody}
              </p>
            </>
          ) : (
            <>
              <h1
                className="text-2xl mb-1"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
              >
                {t.auth.forgotPasswordTitle}
              </h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
                {t.auth.forgotPasswordSubtitle}
              </p>

              {expired && (
                <p className="text-sm mb-4" style={{ color: "var(--accent-strong)" }}>
                  {t.auth.resetLinkExpiredError}
                </p>
              )}

              <form action={formAction} className="flex flex-col gap-4">
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
                  {pending ? t.auth.pleaseWait : t.auth.sendResetLinkBtn}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-xs mt-6" style={{ color: "var(--text-soft)" }}>
            <Link href="/login" className="font-semibold" style={{ color: "var(--accent-strong)" }}>
              {t.auth.backToLoginLink}
            </Link>
          </p>
        </div>

        <div className="flex justify-center mt-6">
          <LocaleToggle locale={locale} />
        </div>
      </div>
    </div>
  );
}
