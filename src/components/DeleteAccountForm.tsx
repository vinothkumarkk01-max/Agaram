"use client";

import { useActionState, type CSSProperties } from "react";
import { deleteAccount } from "@/app/actions/account";

const inputStyle: CSSProperties = {
  background: "var(--bg-sunken)",
  border: "1px solid var(--line)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  color: "var(--text)",
  width: "100%",
};

export function DeleteAccountForm({ email }: { email: string }) {
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
        <span>
          I understand this permanently deletes my profile, matches,
          messages, and payment history — for the other person in any
          match too — and can&rsquo;t be undone.
        </span>
      </label>

      <div>
        <label
          htmlFor="confirm_email"
          className="block text-xs font-semibold mb-1.5"
          style={{ color: "var(--text-soft)" }}
        >
          Type <span className="font-mono">{email}</span> to confirm
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
        {pending ? "Deleting…" : "Permanently delete my account"}
      </button>
    </form>
  );
}
