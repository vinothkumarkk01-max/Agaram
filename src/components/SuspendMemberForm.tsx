"use client";

import { useActionState } from "react";
import { suspendMember } from "@/app/actions/admin";

export function SuspendMemberForm({ profileId }: { profileId: string }) {
  const [state, formAction, pending] = useActionState(suspendMember, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="profile_id" value={profileId} />
      <div className="flex gap-2">
        <input
          name="reason"
          required
          placeholder="Reason for suspending (admin-only note)"
          maxLength={500}
          className="flex-1 rounded-lg px-3 py-2 text-xs"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
          style={{ background: "var(--accent-strong)" }}
        >
          {pending ? "Suspending…" : "Suspend"}
        </button>
      </div>
      {state?.error && (
        <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
