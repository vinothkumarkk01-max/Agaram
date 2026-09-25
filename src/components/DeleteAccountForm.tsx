"use client";

import { useActionState, type CSSProperties } from "react";
import { deleteAccount } from "@/app/actions/account";
import type { Dictionary } from "@/lib/i18n/dictionary";

const inputStyle: CSSProperties = {
  background: "var(--bg-sunken)",
  border: "1px solid var(--line)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "15px",
  color: "var(--text)",
  width: "100%",
};

export function DeleteAccountForm({ email, t }: { email: string; t: Dictionary }) {
  const [state, formAction, pending] = useActionState(deleteAccount, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label
        className="flex items-start gap-2.5 text-xs"
        style={{ color: "var(--text-soft)" }}
      >
        <input
          type="checkbox"
          name="confirm_understood"
          required
          className="mt-0.5"
          style={{ accentColor: "var(--accent-strong)" }}
        />
        <span>{t.account.understandCheckbox}</span>
      </label>

      <div>
        <label
          htmlFor="confirm_email"
          className="block text-xs font-semibold mb-1.5"
          style={{ color: "var(--text-soft)" }}
        >
          {t.account.typeToConfirmPrefix}
          {email}
          {t.account.typeToConfirmSuffix}
        </label>
        <input
          id="confirm_email"
          name="confirm_email"
          type="email"
          required
          autoComplete="off"
          style={inputStyle}
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
        style={{ background: "var(--accent-strong)" }}
      >
        {pending ? t.account.deleting : t.account.permanentlyDelete}
      </button>
    </form>
  );
}
