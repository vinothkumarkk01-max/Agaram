import { expressInterest, passOnCandidate } from "@/app/actions/matches";
import { CandidatePhoto } from "@/components/CandidatePhoto";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { CompatibilityLine } from "@/lib/matchReasons";

export type MaskedCandidate = {
  id: string;
  age: number;
  location: string | null;
  initial: string;
  is_verified: boolean;
  has_photo: boolean;
  is_phone_verified: boolean;
  family_type: string | null;
  diet: string | null;
  native_district: string | null;
  community: string | null;
};

/**
 * Browse Matches' card — a large photo leads (see CandidatePhoto),
 * everything else follows below it. Previously a small 64px circular
 * avatar beside a block of text; direct founder feedback (Sept 2026)
 * asked for the photo itself to be the point of the card, "as big as
 * possible," both because it's what a member actually decides on and
 * because it gives candidates a reason to upload a genuinely good
 * photo. Verified/phone-verified now read as real badge chips instead
 * of plain green text lines — Agaram_Visual_Design_System_v1.md's
 * "Profile card" spec, applied here for the first time in the live
 * app rather than only the design prototype.
 */
export function CandidateCard({
  candidate,
  photoUrl,
  photoIsOriginal,
  reasons,
  compatibility,
  t,
}: {
  candidate: MaskedCandidate;
  photoUrl?: string | null;
  photoIsOriginal?: boolean;
  reasons?: string[];
  compatibility?: CompatibilityLine[];
  t: Dictionary;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
    >
      <CandidatePhoto
        url={photoUrl}
        isOriginal={photoIsOriginal}
        initial={`${candidate.initial}.`}
        privacyLabel={t.matches.privateUntilMutual}
      />

      <div className="p-5">
        <div className="text-base font-semibold mb-2">
          {candidate.age} {t.dashboard.years}
          {candidate.location ? ` · ${candidate.location}` : ""}
        </div>

        {(candidate.is_verified || candidate.is_phone_verified) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {candidate.is_verified && (
              <span
                className="text-xs font-semibold rounded-full px-2.5 py-1"
                style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
              >
                {t.dashboard.identityVerified}
              </span>
            )}
            {candidate.is_phone_verified && (
              <span
                className="text-xs font-semibold rounded-full px-2.5 py-1"
                style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
              >
                {t.dashboard.phoneVerified}
              </span>
            )}
          </div>
        )}

        {reasons && reasons.length > 0 && (
          <div className="mb-3">
            <div
              className="text-xs font-semibold mb-1"
              style={{ color: "var(--text-soft)" }}
            >
              {t.matches.whyThisMatch}
            </div>
            <ul className="flex flex-col gap-0.5">
              {reasons.map((reason, i) => (
                <li
                  key={i}
                  className="text-xs"
                  style={{ color: "var(--text-soft)" }}
                >
                  · {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {compatibility && compatibility.length > 0 && (
          <div className="mb-4">
            <div
              className="text-xs font-semibold mb-1"
              style={{ color: "var(--text-soft)" }}
            >
              {t.matches.compatibilityHeading}
            </div>
            <ul className="flex flex-col gap-0.5">
              {compatibility.map((line, i) => (
                <li
                  key={i}
                  className="text-xs flex items-center justify-between gap-3"
                  style={{ color: "var(--text-soft)" }}
                >
                  <span>{line.label}</span>
                  <span
                    className="font-semibold"
                    style={{ color: line.strength === "strong" ? "var(--ok)" : "var(--warn)" }}
                  >
                    {line.strength === "strong"
                      ? t.matches.compatibilityStrong
                      : t.matches.compatibilityGood}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <form action={passOnCandidate.bind(null, candidate.id)} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
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
              className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white"
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
    </div>
  );
}
