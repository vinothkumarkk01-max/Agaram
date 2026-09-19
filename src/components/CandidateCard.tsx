import { expressInterest, passOnCandidate } from "@/app/actions/matches";
import { ProfilePhotoAvatar } from "@/components/ProfilePhotoAvatar";
import type { Dictionary } from "@/lib/i18n/dictionary";

export type MaskedCandidate = {
  id: string;
  age: number;
  location: string | null;
  initial: string;
  is_verified: boolean;
  has_photo: boolean;
};

export function CandidateCard({
  candidate,
  photoUrl,
  t,
}: {
  candidate: MaskedCandidate;
  photoUrl?: string | null;
  t: Dictionary;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center justify-between gap-4"
      style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-4">
        <ProfilePhotoAvatar url={photoUrl} initial={`${candidate.initial}.`} size={48} />
        <div>
          <div className="text-sm font-semibold">
            {candidate.age} {t.dashboard.years}
            {candidate.location ? ` · ${candidate.location}` : ""}
          </div>
          {candidate.is_verified && (
            <div
              className="text-xs font-semibold mt-1"
              style={{ color: "var(--ok)" }}
            >
              {t.dashboard.identityVerified}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <form action={passOnCandidate.bind(null, candidate.id)}>
          <button
            type="submit"
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              color: "var(--text-soft)",
            }}
          >
            {t.matches.pass}
          </button>
        </form>
        <form action={expressInterest.bind(null, candidate.id)}>
          <button
            type="submit"
            className="rounded-xl px-4 py-2 text-sm font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            {t.matches.interested}
          </button>
        </form>
      </div>
    </div>
  );
}
