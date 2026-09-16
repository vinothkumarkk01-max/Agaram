import { expressInterest, passOnCandidate } from "@/app/actions/matches";
import type { Dictionary } from "@/lib/i18n/dictionary";

export type MaskedCandidate = {
  id: string;
  age: number;
  location: string | null;
  initial: string;
  is_verified: boolean;
};

export function CandidateCard({
  candidate,
  t,
}: {
  candidate: MaskedCandidate;
  t: Dictionary;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center justify-between gap-4"
      style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
          style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
        >
          {candidate.initial}.
        </div>
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
