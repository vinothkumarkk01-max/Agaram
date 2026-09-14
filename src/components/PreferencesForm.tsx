"use client";

import { useActionState, type CSSProperties } from "react";
import { savePreferences } from "@/app/actions/profile";
import { PillGroup } from "@/components/PillGroup";

const fieldLabel: CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  color: "var(--text-soft)",
  fontWeight: 700,
  marginBottom: "8px",
};

const inputStyle: CSSProperties = {
  background: "var(--bg-raised)",
  border: "1px solid var(--line)",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  color: "var(--text)",
  width: "100%",
};

export function PreferencesForm({
  defaults,
}: {
  defaults?: {
    age_min?: number;
    age_max?: number;
    preferred_locations?: string[];
    education_level?: string;
    profession_field?: string;
    open_to_relocating?: string;
    languages?: string[];
  };
}) {
  const [state, formAction, pending] = useActionState(savePreferences, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <div style={fieldLabel}>Age range</div>
          <div className="flex gap-2.5">
            <input
              name="age_min"
              type="number"
              min={18}
              placeholder="Min"
              defaultValue={defaults?.age_min}
              required
              style={inputStyle}
            />
            <input
              name="age_max"
              type="number"
              min={18}
              placeholder="Max"
              defaultValue={defaults?.age_max}
              required
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <div style={fieldLabel}>Preferred location(s)</div>
          <input
            name="preferred_locations"
            defaultValue={defaults?.preferred_locations?.join(", ")}
            style={inputStyle}
            placeholder="Chennai, Bengaluru, Coimbatore"
          />
        </div>

        <div>
          <div style={fieldLabel}>Education level</div>
          <PillGroup
            name="education_level"
            defaultValue={defaults?.education_level ?? "bachelors_plus"}
            options={[
              { value: "bachelors_plus", label: "Bachelor's+" },
              { value: "any", label: "Any" },
            ]}
          />
        </div>

        <div>
          <div style={fieldLabel}>Profession / field</div>
          <input
            name="profession_field"
            defaultValue={defaults?.profession_field}
            style={inputStyle}
            placeholder="Open to any field"
          />
        </div>

        <div>
          <div style={fieldLabel}>Open to relocating</div>
          <PillGroup
            name="open_to_relocating"
            defaultValue={defaults?.open_to_relocating ?? "maybe"}
            options={[
              { value: "yes", label: "Yes" },
              { value: "maybe", label: "Maybe" },
              { value: "no", label: "No" },
            ]}
          />
        </div>

        <div>
          <div style={fieldLabel}>Language</div>
          <input
            name="languages"
            defaultValue={defaults?.languages?.join(", ")}
            style={inputStyle}
            placeholder="Tamil, English"
          />
        </div>
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
          style={{ background: "var(--accent)" }}
        >
          {pending ? "Saving…" : "See what's next"}
        </button>
        <p
          className="text-center text-xs mt-3.5"
          style={{ color: "var(--text-soft)" }}
        >
          You can add more preferences (family, lifestyle, cultural) any time.
        </p>
      </div>
    </form>
  );
}
