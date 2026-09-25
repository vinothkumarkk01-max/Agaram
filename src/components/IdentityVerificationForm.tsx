"use client";

import { useActionState, type CSSProperties } from "react";
import { submitIdentityVerification } from "@/app/actions/verification";
import type { Dictionary } from "@/lib/i18n/dictionary";

const fieldLabel: CSSProperties = {
  fontSize: "12px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-soft)",
  fontWeight: 600,
  marginBottom: "8px",
};

const inputStyle: CSSProperties = {
  background: "var(--bg-raised)",
  border: "1px solid var(--line)",
  borderRadius: "14px",
  padding: "14px 16px",
  fontSize: "16px",
  color: "var(--text)",
  width: "100%",
  letterSpacing: "0.04em",
};

export function IdentityVerificationForm({ t }: { t: Dictionary }) {
  const [state, formAction, pending] = useActionState(
    submitIdentityVerification,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <div style={fieldLabel}>{t.onboarding.aadhaarNumber}</div>
        <input
          name="aadhaar_number"
          inputMode="numeric"
          maxLength={14}
          required
          style={inputStyle}
          placeholder="XXXX XXXX XXXX"
        />
        <p className="text-xs mt-2" style={{ color: "var(--text-soft)" }}>
          {t.onboarding.aadhaarHelp}
        </p>
      </div>

      <label
        className="flex items-start gap-3 text-sm"
        style={{ color: "var(--text-soft)" }}
      >
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5"
          style={{ accentColor: "var(--accent-strong)" }}
        />
        <span>{t.onboarding.consentLabel}</span>
      </label>

      {state?.error && (
        <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
          {state.error}
        </p>
      )}

      <div className="pt-1">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl py-4 font-bold text-white text-sm disabled:opacity-60"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          {pending ? t.onboarding.submitting : t.onboarding.verifyMyIdentity}
        </button>
        <p
          className="text-center text-xs mt-4"
          style={{ color: "var(--text-soft)" }}
        >
          {t.onboarding.mockNote}
        </p>
      </div>
    </form>
  );
}
