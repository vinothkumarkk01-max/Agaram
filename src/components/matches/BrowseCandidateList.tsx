"use client";

import { useMemo, useState } from "react";
import { CandidateCard, type MaskedCandidate } from "@/components/CandidateCard";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { CompatibilityLine } from "@/lib/matchReasons";

type CandidateEntry = {
  candidate: MaskedCandidate;
  photoUrl?: string | null;
  photoIsOriginal?: boolean;
  reasons?: string[];
  compatibility?: CompatibilityLine[];
};

const controlStyle = {
  background: "var(--bg-raised)",
  border: "1px solid var(--line)",
  borderRadius: "10px",
  padding: "8px 10px",
  fontSize: "14px",
  color: "var(--text)",
} as const;

/**
 * Browse's own quick filters (Sept 2026) — founder feedback: the
 * candidate list was long enough that scrolling to find someone
 * relevant was tedious, even though get_match_candidates() already
 * narrows by the viewer's own saved age-range/location preference
 * server-side. This narrows the already-fetched list further,
 * entirely client-side (no extra round trip) — age/location/family
 * type/diet are the only fields MaskedCandidate actually carries, so
 * that's exactly what's filterable here; nothing invented.
 */
export function BrowseCandidateList({ items, t }: { items: CandidateEntry[]; t: Dictionary }) {
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [location, setLocation] = useState("");
  const [familyType, setFamilyType] = useState("");
  const [diet, setDiet] = useState("");

  const hasActiveFilters =
    verifiedOnly || ageMin !== "" || ageMax !== "" || location.trim() !== "" || familyType !== "" || diet !== "";

  const filtered = useMemo(() => {
    const min = ageMin === "" ? null : Number(ageMin);
    const max = ageMax === "" ? null : Number(ageMax);
    const loc = location.trim().toLowerCase();
    return items.filter(({ candidate: c }) => {
      if (verifiedOnly && !c.is_verified) return false;
      if (min !== null && c.age < min) return false;
      if (max !== null && c.age > max) return false;
      if (loc && !(c.location ?? "").toLowerCase().includes(loc)) return false;
      if (familyType && c.family_type !== familyType) return false;
      if (diet && c.diet !== diet) return false;
      return true;
    });
  }, [items, verifiedOnly, ageMin, ageMax, location, familyType, diet]);

  function clearFilters() {
    setVerifiedOnly(false);
    setAgeMin("");
    setAgeMax("");
    setLocation("");
    setFamilyType("");
    setDiet("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-2xl p-4 flex flex-wrap items-end gap-3"
        style={{ background: "var(--bg-sunken)" }}
      >
        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-soft)" }}
          >
            {t.onboarding.age}
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              min={18}
              max={100}
              placeholder={t.onboarding.min}
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              className="w-16"
              style={controlStyle}
            />
            <span style={{ color: "var(--text-soft)" }}>–</span>
            <input
              type="number"
              inputMode="numeric"
              min={18}
              max={100}
              placeholder={t.onboarding.max}
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              className="w-16"
              style={controlStyle}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-soft)" }}
          >
            {t.matches.filtersLocationLabel}
          </label>
          <input
            type="text"
            placeholder={t.matches.filtersLocationPlaceholder}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-36"
            style={controlStyle}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-soft)" }}
          >
            {t.account.extendedFamilyTypePref}
          </label>
          <select
            value={familyType}
            onChange={(e) => setFamilyType(e.target.value)}
            style={controlStyle}
          >
            <option value="">{t.onboarding.any}</option>
            <option value="nuclear">{t.account.extendedFamilyNuclear}</option>
            <option value="joint">{t.account.extendedFamilyJoint}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-soft)" }}
          >
            {t.account.extendedDietPref}
          </label>
          <select value={diet} onChange={(e) => setDiet(e.target.value)} style={controlStyle}>
            <option value="">{t.onboarding.any}</option>
            <option value="vegetarian">{t.account.extendedDietVeg}</option>
            <option value="non_vegetarian">{t.account.extendedDietNonVeg}</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm pb-2" style={{ color: "var(--text)" }}>
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
          />
          {t.matches.filtersVerifiedOnly}
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold pb-2.5 ml-auto"
            style={{ color: "var(--accent-strong)" }}
          >
            {t.matches.filtersClear}
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="text-xs" style={{ color: "var(--text-soft)" }}>
          {t.matches.filtersShowingPrefix}
          {filtered.length}
          {t.matches.filtersShowingOf}
          {items.length}
          {t.matches.filtersShowingSuffix}
        </div>
      )}

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center text-sm"
          style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
        >
          {t.matches.filtersNoResults}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ candidate, photoUrl, photoIsOriginal, reasons, compatibility }) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              photoUrl={photoUrl}
              photoIsOriginal={photoIsOriginal}
              reasons={reasons}
              compatibility={compatibility}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
