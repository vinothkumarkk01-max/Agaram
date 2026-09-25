"use client";

import { useActionState, type CSSProperties } from "react";
import { saveJathagamDetails } from "@/app/actions/jathagam";
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

const fieldLabel: CSSProperties = {
  fontSize: "12px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-soft)",
  fontWeight: 600,
  marginBottom: "6px",
};

export function JathagamForm({
  t,
  details,
}: {
  t: Dictionary;
  details: {
    birth_date: string | null;
    birth_time: string | null;
    birth_place: string | null;
    birth_star: string | null;
    rasi: string | null;
    visibility: "private" | "mutual_match";
  } | null;
}) {
  const [state, formAction, pending] = useActionState(saveJathagamDetails, undefined);

  return (
    // Keyed on the current server data for the same reason as
    // ExtendedPreferencesForm's forms: React 19 resets an uncontrolled
    // form's fields to their ORIGINAL mount-time defaultValue as soon
    // as its action resolves, and this form stays visible after a
    // successful save rather than redirecting — without a key change
    // to force a remount once the freshly-saved data comes back, every
    // field (including the share checkbox) would snap back to
    // whatever it showed before Save was clicked.
    <form key={JSON.stringify(details)} action={formAction} className="flex flex-col gap-3">
      <p className="text-xs mb-1" style={{ color: "var(--text-soft)" }}>
        {t.account.jathagamNoScoreNotice}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div style={fieldLabel}>{t.account.jathagamBirthDate}</div>
          <input
            name="birth_date"
            type="date"
            defaultValue={details?.birth_date ?? ""}
            style={inputStyle}
          />
        </div>
        <div>
          <div style={fieldLabel}>{t.account.jathagamBirthTime}</div>
          <input
            name="birth_time"
            type="time"
            defaultValue={details?.birth_time ?? ""}
            style={inputStyle}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>
            {t.account.jathagamBirthTimeHelp}
          </p>
        </div>
      </div>
      <div>
        <div style={fieldLabel}>{t.account.jathagamBirthPlace}</div>
        <input
          name="birth_place"
          defaultValue={details?.birth_place ?? ""}
          style={inputStyle}
          placeholder={t.account.jathagamBirthPlacePlaceholder}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div style={fieldLabel}>{t.account.jathagamBirthStar}</div>
          <input
            name="birth_star"
            defaultValue={details?.birth_star ?? ""}
            style={inputStyle}
            placeholder={t.account.jathagamBirthStarPlaceholder}
          />
        </div>
        <div>
          <div style={fieldLabel}>{t.account.jathagamRasi}</div>
          <input
            name="rasi"
            defaultValue={details?.rasi ?? ""}
            style={inputStyle}
            placeholder={t.account.jathagamRasiPlaceholder}
          />
        </div>
      </div>
      <label className="flex items-start gap-2.5 text-xs mt-1" style={{ color: "var(--text-soft)" }}>
        <input
          type="checkbox"
          name="visibility"
          value="mutual_match"
          defaultChecked={details?.visibility === "mutual_match"}
          className="mt-0.5"
        />
        <span>{t.account.jathagamShareLabel}</span>
      </label>
      {state?.error && (
        <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-xs" style={{ color: "var(--ok)" }}>
          {state.success}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
        style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)", color: "var(--text)" }}
      >
        {pending ? t.account.extendedSaving : t.account.extendedSave}
      </button>
    </form>
  );
}
