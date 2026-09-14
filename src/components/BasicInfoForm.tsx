"use client";

import { useActionState, type CSSProperties } from "react";
import { saveBasicInfo } from "@/app/actions/profile";
import { PillGroup } from "@/components/PillGroup";

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
};

export function BasicInfoForm({
  defaults,
}: {
  defaults?: {
    full_name?: string;
    profile_type?: string;
    age?: number;
    about_me?: string;
  };
}) {
  const [state, formAction, pending] = useActionState(saveBasicInfo, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <div style={fieldLabel}>Full name</div>
        <input
          name="full_name"
          defaultValue={defaults?.full_name}
          required
          style={inputStyle}
          placeholder="Your name"
        />
      </div>

      <div>
        <div style={fieldLabel}>I am a</div>
        <PillGroup
          name="profile_type"
          defaultValue={defaults?.profile_type ?? "groom"}
          options={[
            { value: "groom", label: "Groom" },
            { value: "bride", label: "Bride" },
          ]}
        />
      </div>

      <div>
        <div style={fieldLabel}>Age</div>
        <input
          name="age"
          type="number"
          min={18}
          max={100}
          defaultValue={defaults?.age}
          required
          style={{ ...inputStyle, maxWidth: "160px" }}
        />
      </div>

      <div>
        <div style={fieldLabel}>
          A line about you <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
        </div>
        <textarea
          name="about_me"
          defaultValue={defaults?.about_me}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Enjoys long-distance running, close to family…"
        />
      </div>

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
            background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          {pending ? "Saving…" : "Continue"}
        </button>
        <p
          className="text-center text-xs mt-4"
          style={{ color: "var(--text-soft)" }}
        >
          Next: your must-have preferences — identity and other checks come after.
        </p>
      </div>
    </form>
  );
}
