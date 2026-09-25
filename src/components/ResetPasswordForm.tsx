"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions/auth";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locale";
import { LocaleToggle } from "@/components/LocaleToggle";
import { BrandMark } from "@/components/BrandMark";

type Props = {
  locale: Locale;
  t: Dictionary;
};

/**
 * /reset-password — step two of self-service password reset. Only
 * reachable with a real (recovery or ordinary) session — see
 * updatePassword's comment in actions/auth.ts for what happens
 * otherwise. Client-side password-match check is a fast first pass;
 * updatePassword re-checks both rules server-side regardless, since a
 * client check alone is never the actual guarantee.
 */
export function ResetPasswordForm({ locale, t }: Props) {
  const [state, formAction, pending] = useActionState(updatePassword, undefined);

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
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            {t.auth.resetPasswordTitle}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
            {t.auth.resetPasswordSubtitle}
          </p>

          <form action={formAction} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-soft)" }}
              >
                {t.auth.newPassword}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                }}
                placeholder={t.auth.passwordPlaceholder}
              />
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-soft)" }}
              >
                {t.auth.confirmPassword}
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
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
              {pending ? t.auth.pleaseWait : t.auth.updatePasswordBtn}
            </button>
          </form>
        </div>

        <div className="flex justify-center mt-6">
          <LocaleToggle locale={locale} />
        </div>
      </div>
    </div>
  );
}
