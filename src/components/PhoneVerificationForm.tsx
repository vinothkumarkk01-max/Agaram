"use client";

import { useActionState, type CSSProperties } from "react";
import { submitPhoneVerification } from "@/app/actions/phone";
import { PhoneVerificationPending } from "@/components/PhoneVerificationPending";
import type { Dictionary } from "@/lib/i18n/dictionary";

const inputStyle: CSSProperties = {
  background: "var(--bg-sunken)",
  border: "1px solid var(--line)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  color: "var(--text)",
  width: "100%",
};

/**
 * A second, independent identity signal alongside Aadhaar-based
 * identity verification (EmploymentVerification / IdentityVerificationForm)
 * — see the Phase 29 schema comment for why this is honestly mocked:
 * there's no SMS vendor connected, so there's no real code to send or
 * check yet, only a placeholder "pending -> verified" transition,
 * clearly labeled as such below.
 */
export function PhoneVerificationForm({
  t,
  status,
  phoneNumber,
}: {
  t: Dictionary;
  status: "pending" | "verified" | "failed" | null;
  phoneNumber: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitPhoneVerification, undefined);

  if (status === "pending") {
    return <PhoneVerificationPending t={t} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "verified" && phoneNumber && (
        <div
          className="rounded-xl p-3.5 text-sm font-semibold"
          style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
        >
          {t.account.phoneVerifiedPrefix}
          {phoneNumber}
        </div>
      )}
      <p className="text-xs" style={{ color: "var(--text-soft)" }}>
        {t.account.phoneMockNote}
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="phone_number"
          type="tel"
          defaultValue={phoneNumber ?? ""}
          placeholder={t.account.phoneNumberPlaceholder}
          style={inputStyle}
        />
        <label className="flex items-start gap-2.5 text-xs" style={{ color: "var(--text-soft)" }}>
          <input type="checkbox" name="consent" className="mt-0.5" />
          <span>{t.account.phoneConsentLabel}</span>
        </label>
        {state?.error && (
          <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
          style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)", color: "var(--text)" }}
        >
          {pending
            ? t.account.extendedSaving
            : status === "verified"
              ? t.account.phoneReverify
              : t.account.phoneVerifyButton}
        </button>
      </form>
    </div>
  );
}
