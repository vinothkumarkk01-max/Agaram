"use client";

import { useActionState, type CSSProperties } from "react";
import { saveBackgroundInfo, saveExtendedPreferences } from "@/app/actions/profile";
import type { Dictionary } from "@/lib/i18n/dictionary";

const selectStyle: CSSProperties = {
  background: "var(--bg-sunken)",
  border: "1px solid var(--line)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  color: "var(--text)",
  width: "100%",
};

const fieldLabel: CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-soft)",
  fontWeight: 600,
  marginBottom: "6px",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

export function ExtendedPreferencesForm({
  t,
  background,
  preferences,
}: {
  t: Dictionary;
  background: {
    family_type: string | null;
    diet: string | null;
    native_district: string | null;
    community: string | null;
  };
  preferences: {
    family_type_preference: string;
    family_involvement_preference: string;
    diet_preference: string;
    drinking_preference: string;
    smoking_preference: string;
    native_district_preference: string | null;
    community_preference: string;
    religious_practice_preference: string;
  };
}) {
  const [bgState, bgAction, bgPending] = useActionState(saveBackgroundInfo, undefined);
  const [prefState, prefAction, prefPending] = useActionState(saveExtendedPreferences, undefined);

  return (
    <div className="flex flex-col gap-6">
      {/* "Who I am" — self-description. Kept visibly separate from the
          "who I want" preferences form below, exactly like
          profiles.community vs preferences.community_preference. */}
      <div>
        <h3 className="text-sm font-bold mb-3">{t.account.extendedBackgroundHeading}</h3>
        {/* React 19 resets an uncontrolled form's fields to their
            ORIGINAL mount-time defaultValue as soon as its action
            resolves — which, for a form that stays on screen after a
            successful save (this one never redirects, unlike
            saveBasicInfo), means every field would snap back to
            whatever it showed before this save, not what was just
            saved. Keying the form on the current server data forces a
            fresh mount (with the freshly-saved values as its new
            defaultValue) once revalidatePath's re-fetch lands, instead
            of silently discarding what the member just entered. */}
        <form key={JSON.stringify(background)} action={bgAction} className="flex flex-col gap-3">
          <Field label={t.account.extendedFamilyType}>
            <select name="family_type" defaultValue={background.family_type ?? ""} style={selectStyle}>
              <option value="">{t.account.extendedNotSet}</option>
              <option value="nuclear">{t.account.extendedFamilyNuclear}</option>
              <option value="joint">{t.account.extendedFamilyJoint}</option>
            </select>
          </Field>
          <Field label={t.account.extendedDiet}>
            <select name="diet" defaultValue={background.diet ?? ""} style={selectStyle}>
              <option value="">{t.account.extendedNotSet}</option>
              <option value="vegetarian">{t.account.extendedDietVeg}</option>
              <option value="non_vegetarian">{t.account.extendedDietNonVeg}</option>
            </select>
          </Field>
          <Field label={t.account.extendedNativeDistrict}>
            <input
              name="native_district"
              defaultValue={background.native_district ?? ""}
              style={selectStyle}
              placeholder={t.account.extendedNativeDistrictPlaceholder}
            />
          </Field>
          <Field label={t.account.extendedCommunity}>
            <input
              name="community"
              defaultValue={background.community ?? ""}
              style={selectStyle}
              placeholder={t.account.extendedCommunityPlaceholder}
            />
          </Field>
          {bgState?.error && (
            <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
              {bgState.error}
            </p>
          )}
          {bgState?.success && (
            <p className="text-xs" style={{ color: "var(--ok)" }}>
              {bgState.success}
            </p>
          )}
          <button
            type="submit"
            disabled={bgPending}
            className="self-start rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
            style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)", color: "var(--text)" }}
          >
            {bgPending ? t.account.extendedSaving : t.account.extendedSave}
          </button>
        </form>
      </div>

      <div style={{ borderTop: "1px solid var(--line)" }} />

      {/* "Who I want" — preferences, defaulting to no_preference
          everywhere. Family type, diet, native district, and
          community are now used as Browse filters (schema.sql
          Phase 30) — the other four (family involvement, drinking,
          smoking, religious practice) still aren't, since there's no
          matching "about me" field yet to compare them against. */}
      <div>
        <h3 className="text-sm font-bold mb-1">{t.account.extendedPreferencesHeading}</h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
          {t.account.extendedPreferencesNotUsedYet}
        </p>
        {/* Same reset issue and same fix as the background form above. */}
        <form key={JSON.stringify(preferences)} action={prefAction} className="flex flex-col gap-3">
          <Field label={t.account.extendedFamilyTypePref}>
            <select
              name="family_type_preference"
              defaultValue={preferences.family_type_preference}
              style={selectStyle}
            >
              <option value="no_preference">{t.account.extendedNoPreference}</option>
              <option value="nuclear">{t.account.extendedFamilyNuclear}</option>
              <option value="joint">{t.account.extendedFamilyJoint}</option>
            </select>
          </Field>
          <Field label={t.account.extendedFamilyInvolvementPref}>
            <select
              name="family_involvement_preference"
              defaultValue={preferences.family_involvement_preference}
              style={selectStyle}
            >
              <option value="no_preference">{t.account.extendedNoPreference}</option>
              <option value="low">{t.account.extendedInvolvementLow}</option>
              <option value="medium">{t.account.extendedInvolvementMedium}</option>
              <option value="high">{t.account.extendedInvolvementHigh}</option>
            </select>
          </Field>
          <Field label={t.account.extendedDietPref}>
            <select name="diet_preference" defaultValue={preferences.diet_preference} style={selectStyle}>
              <option value="no_preference">{t.account.extendedNoPreference}</option>
              <option value="vegetarian">{t.account.extendedDietVeg}</option>
              <option value="non_vegetarian">{t.account.extendedDietNonVeg}</option>
            </select>
          </Field>
          <Field label={t.account.extendedDrinkingPref}>
            <select
              name="drinking_preference"
              defaultValue={preferences.drinking_preference}
              style={selectStyle}
            >
              <option value="no_preference">{t.account.extendedNoPreference}</option>
              <option value="yes">{t.common.yes}</option>
              <option value="occasionally">{t.account.extendedOccasionally}</option>
              <option value="no">{t.common.no}</option>
            </select>
          </Field>
          <Field label={t.account.extendedSmokingPref}>
            <select
              name="smoking_preference"
              defaultValue={preferences.smoking_preference}
              style={selectStyle}
            >
              <option value="no_preference">{t.account.extendedNoPreference}</option>
              <option value="yes">{t.common.yes}</option>
              <option value="no">{t.common.no}</option>
            </select>
          </Field>
          <Field label={t.account.extendedNativeDistrictPref}>
            <input
              name="native_district_preference"
              defaultValue={preferences.native_district_preference ?? ""}
              style={selectStyle}
              placeholder={t.account.extendedNativeDistrictPlaceholder}
            />
          </Field>
          <Field label={t.account.extendedCommunityPref}>
            <input
              name="community_preference"
              defaultValue={
                preferences.community_preference === "no_preference"
                  ? ""
                  : preferences.community_preference
              }
              style={selectStyle}
              placeholder={t.account.extendedNoPreference}
            />
          </Field>
          <Field label={t.account.extendedReligiousPracticePref}>
            <select
              name="religious_practice_preference"
              defaultValue={preferences.religious_practice_preference}
              style={selectStyle}
            >
              <option value="no_preference">{t.account.extendedNoPreference}</option>
              <option value="important">{t.account.extendedReligiousImportant}</option>
            </select>
          </Field>
          {prefState?.error && (
            <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
              {prefState.error}
            </p>
          )}
          {prefState?.success && (
            <p className="text-xs" style={{ color: "var(--ok)" }}>
              {prefState.success}
            </p>
          )}
          <button
            type="submit"
            disabled={prefPending}
            className="self-start rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
            style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)", color: "var(--text)" }}
          >
            {prefPending ? t.account.extendedSaving : t.account.extendedSave}
          </button>
        </form>
      </div>
    </div>
  );
}
