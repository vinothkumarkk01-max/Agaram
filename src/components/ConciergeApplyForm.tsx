"use client";

import { useActionState, type CSSProperties } from "react";
import { submitConciergeApplication } from "@/app/actions/concierge";
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

export function ConciergeApplyForm({ t }: { t: Dictionary }) {
  const [state, formAction, pending] = useActionState(
    submitConciergeApplication,
    undefined
  );

  if (state?.success) {
    return (
      <p className="text-sm font-semibold" style={{ color: "var(--ok)" }}>
        {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label
          htmlFor="contact_phone"
          className="block text-xs font-semibold mb-1.5"
          style={{ color: "var(--text-soft)" }}
        >
          {t.concierge.phoneLabel}
        </label>
        <input
          id="contact_phone"
          name="contact_phone"
          type="tel"
          required
          placeholder={t.concierge.phonePlaceholder}
          style={inputStyle}
        />
      </div>
      <div>
        <label
          htmlFor="notes"
          className="block text-xs font-semibold mb-1.5"
          style={{ color: "var(--text-soft)" }}
        >
          {t.concierge.notesLabel}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder={t.concierge.notesPlaceholder}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
      {state?.error && (
        <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
        }}
      >
        {pending ? t.concierge.submitting : t.concierge.submitRequest}
      </button>
    </form>
  );
}
