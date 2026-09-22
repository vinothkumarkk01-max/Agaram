import { expressInterest, passOnCandidate } from "@/app/actions/matches";
import { CandidatePhoto } from "@/components/CandidatePhoto";
import type { MaskedCandidate } from "@/components/CandidateCard";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Dashboard's "Today's introduction" (Sept 2026) — the PRD's
 * preview-introduction moment, finally implemented. Still a SMALLER
 * version of CandidateCard content-wise (at most two reasons, no
 * compatibility breakdown, so this doesn't undo the same-round work
 * that shortened the rest of the dashboard) — but not a smaller PHOTO.
 * Direct founder feedback (Sept 2026): candidate photos need to read
 * as large, real photos, not icons, and that applies here as much as
 * to Browse, since this is the first candidate a member sees at all.
 * "See all matches" links to the full Browse list for anyone who
 * wants the complete picture.
 */
export function TodaysIntroCard({
  candidate,
  photoUrl,
  photoIsOriginal,
  reasons,
  t,
}: {
  candidate: MaskedCandidate;
  photoUrl?: string | null;
  photoIsOriginal?: boolean;
  reasons: string[];
  t: Dictionary;
}) {
  // md:max-w-xs — the mobile card is already narrow enough that the
  // 4:5 photo reads well full-width, but the desktop dashboard's wider
  // main column would otherwise stretch this into an oversized hero;
  // capping the width (not the aspect ratio) keeps it a photo-led
  // preview card rather than the whole column.
  return (
    <div
      className="rounded-xl overflow-hidden mb-4 md:max-w-xs"
      style={{ background: "var(--bg-sunken)" }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wider px-4 pt-4 pb-3"
        style={{ color: "var(--text-soft)" }}
      >
        {t.dashboard.todaysIntroHeading}
      </div>

      <CandidatePhoto
        url={photoUrl}
        isOriginal={photoIsOriginal}
        initial={`${candidate.initial}.`}
        privacyLabel={t.matches.privateUntilMutual}
      />

      <div className="p-4">
        <div className="text-sm font-semibold">
          {candidate.age} {t.dashboard.years}
          {candidate.location ? ` · ${candidate.location}` : ""}
        </div>
        {candidate.is_verified && (
          <span
            className="inline-block text-xs font-semibold rounded-full px-2.5 py-1 mt-2"
            style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
          >
            {t.dashboard.identityVerified}
          </span>
        )}
        {reasons.slice(0, 2).map((reason, i) => (
          <div key={i} className="text-xs mt-1.5" style={{ color: "var(--text-soft)" }}>
            · {reason}
          </div>
        ))}

        <div className="flex gap-2 mt-3">
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
    </div>
  );
}
