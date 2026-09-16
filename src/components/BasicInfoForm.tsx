"use client";

import { useActionState, type CSSProperties } from "react";
import { saveBasicInfo } from "@/app/actions/profile";
import { PillGroup } from "@/components/PillGroup";
import type { Dictionary } from "@/lib/i18n/dictionary";

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
  t,
}: {
  defaults?: {
    full_name?: string;
    profile_type?: string;
    age?: number;
    location?: string;
    about_me?: string;
  };
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(saveBasicInfo, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <div style={fieldLabel}>{t.onboarding.fullName}</div>
        <input
          name="full_name"
          defaultValue={defaults?.full_name}
          required
          style={inputStyle}
          placeholder={t.onboarding.fullNamePlaceholder}
        />
      </div>

      <div>
        <div style={fieldLabel}>{t.onboarding.iAmA}</div>
        <PillGroup
          name="profile_type"
          defaultValue={defaults?.profile_type ?? "groom"}
          options={[
            { value: "groom", label: t.dashboard.groom },
            { value: "bride", label: t.dashboard.bride },
          ]}
        />
      </div>

      <div>
        <div style={fieldLabel}>{t.onboarding.age}</div>
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
        <div style={fieldLabel}>{t.onboarding.city}</div>
        <input
          name="location"
          defaultValue={defaults?.location}
          required
          style={inputStyle}
          placeholder="Chennai"
        />
        <p className="text-xs mt-2" style={{ color: "var(--text-soft)" }}>
          {t.onboarding.cityHelp}
        </p>
      </div>

      <div>
        <div style={fieldLabel}>
          {t.onboarding.aboutLine}{" "}
          <span style={{ textTransform: "none", fontWeight: 400 }}>{t.onboarding.optional}</span>
        </div>
        <textarea
          name="about_me"
          defaultValue={defaults?.about_me}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder={t.onboarding.aboutPlaceholder}
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
          {pending ? t.onboarding.saving : t.onboarding.continueBtn}
        </button>
        <p
          className="text-center text-xs mt-4"
          style={{ color: "var(--text-soft)" }}
        >
          {t.onboarding.basicInfoFooter}
        </p>
      </div>
    </form>
  );
}
