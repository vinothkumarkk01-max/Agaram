"use client";

import { useActionState, type CSSProperties } from "react";
import Link from "next/link";
import { saveBasicInfo } from "@/app/actions/profile";
import { PillGroup } from "@/components/PillGroup";
import { MultiPillGroup } from "@/components/MultiPillGroup";
import { priorityFocusOptions } from "@/lib/priorityFocus";
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
  isEditing = false,
  signupIntent,
  t,
}: {
  defaults?: {
    full_name?: string;
    profile_type?: string;
    age?: number;
    location?: string;
    about_me?: string;
    created_by_relation?: string;
  };
  isEditing?: boolean;
  /** Pre-fill from SignupIntentStep's answers, at signup — only ever
   *  passed on first-time onboarding. See basic-info/page.tsx. */
  signupIntent?: { relationDefault?: string; priorities: string[] };
  t: Dictionary;
}) {
  const [state, formAction, pending] = useActionState(saveBasicInfo, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="mode" value={isEditing ? "edit" : "onboarding"} />

      {/* "Who's setting up this profile" is a one-time onboarding
          question — skipped when editing an already-complete profile,
          both because it rarely needs revisiting and to keep this
          screen shorter (customer feedback, Sept 2026). */}
      {!isEditing && (
      <div>
        <div style={fieldLabel}>{t.onboarding.relationQuestion}</div>
        <select
          name="created_by_relation"
          defaultValue={defaults?.created_by_relation ?? signupIntent?.relationDefault ?? "self"}
          style={inputStyle}
        >
          <option value="self">{t.onboarding.relationSelf}</option>
          <option value="son">{t.onboarding.relationSon}</option>
          <option value="daughter">{t.onboarding.relationDaughter}</option>
          <option value="brother">{t.onboarding.relationBrother}</option>
          <option value="sister">{t.onboarding.relationSister}</option>
          <option value="friend">{t.onboarding.relationFriend}</option>
          <option value="relative">{t.onboarding.relationRelative}</option>
        </select>
        <p className="text-xs mt-2" style={{ color: "var(--text-soft)" }}>
          {t.onboarding.relationHelp}
        </p>
      </div>
      )}

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

      {/* Captured once, from SignupIntentStep at signup (pre-filled
          here, still editable) — like the relation question above,
          this doesn't need re-asking once a profile already exists.
          See src/lib/priorityFocus.ts and priority_focus on
          `profiles` (schema.sql Phase 32). */}
      {!isEditing && (
      <div>
        <div style={fieldLabel}>{t.onboarding.priorityQuestion}</div>
        <p className="text-xs mb-2.5" style={{ color: "var(--text-soft)", textTransform: "none", letterSpacing: "normal" }}>
          {t.onboarding.priorityHelp}
        </p>
        <MultiPillGroup
          name="priority_focus"
          defaultValue={signupIntent?.priorities ?? []}
          options={priorityFocusOptions(t)}
        />
      </div>
      )}

      {/* Consent was already captured once, at signup — re-showing (and
          re-requiring) this checkbox on every later edit would just be
          friction, and re-setting terms_accepted_at without the member
          actually re-reading anything would overstate what they
          consented to. See saveBasicInfo() for the matching change. */}
      {!isEditing && (
      <label
        className="flex items-start gap-3 text-sm"
        style={{ color: "var(--text-soft)" }}
      >
        <input
          type="checkbox"
          name="terms_accepted"
          required
          className="mt-0.5"
          style={{ accentColor: "var(--accent-strong)" }}
        />
        <span>
          {t.onboarding.termsLabelPrefix}
          <Link href="/privacy" target="_blank" className="underline">
            {t.onboarding.termsLabelLink}
          </Link>
          {t.onboarding.termsLabelSuffix}
        </span>
      </label>
      )}

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
          {pending ? t.onboarding.saving : isEditing ? t.onboarding.saveChanges : t.onboarding.continueBtn}
        </button>
        {!isEditing && (
          <p
            className="text-center text-xs mt-4"
            style={{ color: "var(--text-soft)" }}
          >
            {t.onboarding.basicInfoFooter}
          </p>
        )}
      </div>
    </form>
  );
}
