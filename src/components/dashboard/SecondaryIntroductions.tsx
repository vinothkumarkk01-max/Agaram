import Link from "next/link";
import { CandidatePhoto } from "@/components/CandidatePhoto";
import type { MaskedCandidate } from "@/components/CandidateCard";
import type { Dictionary } from "@/lib/i18n/dictionary";

export type SecondaryCandidate = {
  candidate: MaskedCandidate;
  photoUrl?: string | null;
  photoIsOriginal?: boolean;
  topReason?: string;
};

/**
 * "More people to consider" — 2–3 curated cards below the featured
 * introduction, never a directory grid. Each card reuses the same
 * CandidatePhoto component Browse and the featured hero already use
 * (large portrait, masked until mutual), just at a smaller size, with
 * exactly one reason line — deliberately less detail than the
 * featured card so the hierarchy stays obvious.
 */
export function SecondaryIntroductions({
  items,
  t,
}: {
  items: SecondaryCandidate[];
  t: Dictionary;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--accent-strong)" }}
      >
        {t.dashboard.moreToConsiderHeading}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {items.map(({ candidate, photoUrl, photoIsOriginal, topReason }) => (
          <Link
            key={candidate.id}
            href="/matches"
            className="rounded-xl overflow-hidden block transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
          >
            <CandidatePhoto
              url={photoUrl}
              isOriginal={photoIsOriginal}
              initial={`${candidate.initial}.`}
              privacyLabel={t.matches.privateUntilMutual}
            />
            <div className="p-3">
              <div className="text-sm font-semibold">
                {candidate.age} {t.dashboard.years}
                {candidate.location ? ` · ${candidate.location}` : ""}
              </div>
              {topReason && (
                <div className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>
                  {topReason}
                </div>
              )}
              <span className="text-xs font-semibold inline-block mt-2" style={{ color: "var(--accent-strong)" }}>
                {t.dashboard.viewIntroduction}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
