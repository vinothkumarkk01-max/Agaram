"use client";

import { useActionState, type CSSProperties } from "react";
import { savePreferences } from "@/app/actions/profile";
import { PillGroup } from "@/components/PillGroup";
import type { Dictionary } from "@/lib/i18n/dictionary";

const fieldLabel: CSSProperties = {
  fontSize: "12px",
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
  fontSize: "15px",
  color: "var(--text)",
  width: "100%",
};

export function PreferencesForm({
  defaults,
  t,
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
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(savePreferences, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <div style={fieldLabel}>{t.onboarding.ageRange}</div>
          <div className="flex gap-2.5">
            <input
              name="age_min"
              type="number"
              min={18}
              placeholder={t.onboarding.min}
              defaultValue={defaults?.age_min}
              required
              style={inputStyle}
            />
            <input
              name="age_max"
              type="number"
              min={18}
              placeholder={t.onboarding.max}
              defaultValue={defaults?.age_max}
              required
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <div style={fieldLabel}>{t.onboarding.preferredLocations}</div>
          <input
            name="preferred_locations"
            defaultValue={defaults?.preferred_locations?.join(", ")}
            style={inputStyle}
            placeholder={t.onboarding.preferredLocationsPlaceholder}
          />
        </div>

        <div>
          <div style={fieldLabel}>{t.onboarding.educationLevel}</div>
          <PillGroup
            name="education_level"
            defaultValue={defaults?.education_level ?? "bachelors_plus"}
            options={[
              { value: "bachelors_plus", label: t.dashboard.bachelorsPlus },
              { value: "any", label: t.onboarding.any },
            ]}
          />
        </div>

        <div>
          <div style={fieldLabel}>{t.onboarding.professionField}</div>
          <input
            name="profession_field"
            defaultValue={defaults?.profession_field}
            style={inputStyle}
            placeholder={t.onboarding.professionPlaceholder}
          />
        </div>

        <div>
          <div style={fieldLabel}>{t.onboarding.openToRelocating}</div>
          <PillGroup
            name="open_to_relocating"
            defaultValue={defaults?.open_to_relocating ?? "maybe"}
            options={[
              { value: "yes", label: t.onboarding.yes },
              { value: "maybe", label: t.onboarding.maybe },
              { value: "no", label: t.onboarding.no },
            ]}
          />
        </div>

        <div>
          <div style={fieldLabel}>{t.onboarding.language}</div>
          <input
            name="languages"
            defaultValue={defaults?.languages?.join(", ")}
            style={inputStyle}
            placeholder={t.onboarding.languagePlaceholder}
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
          {pending ? t.onboarding.saving : t.onboarding.seeWhatsNext}
        </button>
        <p
          className="text-center text-xs mt-3.5"
          style={{ color: "var(--text-soft)" }}
        >
          {t.onboarding.preferencesFooter}
        </p>
      </div>
    </form>
  );
}
