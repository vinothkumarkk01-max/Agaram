import { expressInterest, passOnCandidate } from "@/app/actions/matches";
import { ProfilePhotoAvatar } from "@/components/ProfilePhotoAvatar";
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

export function CandidateCard({
  candidate,
  photoUrl,
  reasons,
  compatibility,
  t,
}: {
  candidate: MaskedCandidate;
  photoUrl?: string | null;
  reasons?: string[];
  compatibility?: CompatibilityLine[];
  t: Dictionary;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start justify-between gap-4"
      style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
    >
      <div className="flex items-start gap-4">
        {/* 64px, up from 48 — even a blurred/no-photo placeholder was
            too small to register at a glance on a browsing feed, per
            customer feedback (Sept 2026). */}
        <ProfilePhotoAvatar url={photoUrl} initial={`${candidate.initial}.`} size={64} />
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
          {candidate.is_phone_verified && (
            <div
              className="text-xs font-semibold mt-1"
              style={{ color: "var(--ok)" }}
            >
              {t.dashboard.phoneVerified}
            </div>
          )}
          {reasons && reasons.length > 0 && (
            <div className="mt-2">
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
            <div className="mt-2">
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
