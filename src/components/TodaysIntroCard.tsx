import { expressInterest, passOnCandidate } from "@/app/actions/matches";
import { ProfilePhotoAvatar } from "@/components/ProfilePhotoAvatar";
import type { MaskedCandidate } from "@/components/CandidateCard";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Dashboard's "Today's introduction" (Sept 2026) — the PRD's
 * preview-introduction moment, finally implemented. Deliberately a
 * SMALLER version of CandidateCard: at most two reasons, no
 * compatibility breakdown, so this doesn't undo the same-round work
 * that shortened the rest of the dashboard. "See all matches" links
 * to the full Browse list for anyone who wants the complete picture.
 */
export function TodaysIntroCard({
  candidate,
  photoUrl,
  reasons,
  t,
}: {
  candidate: MaskedCandidate;
  photoUrl?: string | null;
  reasons: string[];
  t: Dictionary;
}) {
  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: "var(--bg-sunken)" }}>
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--text-soft)" }}
      >
        {t.dashboard.todaysIntroHeading}
      </div>
      <div className="flex items-start gap-3 mb-3">
        <ProfilePhotoAvatar url={photoUrl} initial={`${candidate.initial}.`} size={56} />
        <div>
          <div className="text-sm font-semibold">
            {candidate.age} {t.dashboard.years}
            {candidate.location ? ` · ${candidate.location}` : ""}
          </div>
          {candidate.is_verified && (
            <div className="text-xs font-semibold mt-1" style={{ color: "var(--ok)" }}>
              {t.dashboard.identityVerified}
            </div>
          )}
          {reasons.slice(0, 2).map((reason, i) => (
            <div key={i} className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>
              · {reason}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <form action={passOnCandidate.bind(null, candidate.id)} className="flex-1">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-xs font-semibold"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              color: "var(--text-soft)",
            }}
          >
            {t.matches.pass}
          </button>
        </form>
        <form action={expressInterest.bind(null, candidate.id)} className="flex-1">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            {t.matches.interested}
          </button>
        </form>
      </div>
    </div>
  );
}
