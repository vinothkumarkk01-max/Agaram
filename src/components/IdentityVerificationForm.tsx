"use client";

import { useActionState, type CSSProperties } from "react";
import { submitIdentityVerification } from "@/app/actions/verification";

const fieldLabel: CSSProperties = {
  fontSize: "11px",
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
  fontSize: "14.5px",
  color: "var(--text)",
  width: "100%",
  letterSpacing: "0.04em",
};

export function IdentityVerificationForm() {
  const [state, formAction, pending] = useActionState(
    submitIdentityVerification,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <div style={fieldLabel}>Aadhaar number</div>
        <input
          name="aadhaar_number"
          inputMode="numeric"
          maxLength={14}
          required
          style={inputStyle}
          placeholder="XXXX XXXX XXXX"
        />
        <p className="text-xs mt-2" style={{ color: "var(--text-soft)" }}>
          We only ever store the last 4 digits. Your full number is used
          once, for this check, and then discarded.
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
        <span>
          I consent to Agaram verifying my identity using the Aadhaar
          number above, in line with the DPDP Act, 2023.
        </span>
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
          {pending ? "Submitting…" : "Verify my identity"}
        </button>
        <p
          className="text-center text-xs mt-4"
          style={{ color: "var(--text-soft)" }}
        >
          This is a mock check for now — see below for what changes when
          the real verification vendor is connected.
        </p>
      </div>
    </form>
  );
}
