import Link from "next/link";
import { expressInterest, passOnCandidate } from "@/app/actions/matches";
import { CandidatePhoto } from "@/components/CandidatePhoto";
import { WhyIntroduced } from "@/components/dashboard/WhyIntroduced";
import type { MaskedCandidate } from "@/components/CandidateCard";
import type { CompatibilityLine } from "@/lib/matchReasons";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * The dashboard's visual hero (Sept 2026 redesign) — replaces the old
 * "my profile first, a small intro card somewhere below" hierarchy.
 * This is deliberately the single largest, most detailed thing on the
 * page: an editorial two-up composition (large portrait + verification
 * + "why we introduced you"), not a directory row.
 *
 * Verification badges here are read directly off the candidate row
 * (is_verified / is_phone_verified) — the only two signals
 * get_match_candidates() actually exposes for someone else's profile.
 * There is no employment/education signal for OTHER members in this
 * app yet (employment verification is currently a self-only trust
 * signal, see TrustProfileSummary), so this card never claims one.
 */
export function FeaturedIntroduction({
  candidate,
  photoUrl,
  photoIsOriginal,
  compatibility,
  t,
}: {
  candidate: MaskedCandidate;
  photoUrl?: string | null;
  photoIsOriginal?: boolean;
  compatibility: CompatibilityLine[];
  t: Dictionary;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wider px-5 sm:px-6 pt-5 sm:pt-6"
        style={{ color: "var(--accent-strong)" }}
      >
        {t.dashboard.introEyebrow}
      </div>

      <div className="flex flex-col md:flex-row">
        {/* md:self-stretch — the photo always fills the row's full
            height (the row's height is whatever the photo's own 4:5
            aspect ratio produces); the text column below is vertically
            CENTERED within that height rather than top-aligned or
            stretched, so a short "why we introduced you" list (often
            just 2–3 honest lines) reads as a considered editorial
            layout, not a card with an empty gap punched out of it. */}
        <div className="md:w-[42%] md:self-stretch mt-4 md:mt-5 md:mb-5 px-0 md:pl-6">
          <div className="mx-5 sm:mx-6 md:mx-0 h-full rounded-xl overflow-hidden">
            <CandidatePhoto
              url={photoUrl}
              isOriginal={photoIsOriginal}
              initial={`${candidate.initial}.`}
              privacyLabel={t.matches.privateUntilMutual}
            />
          </div>
        </div>

        <div className="md:w-[58%] md:self-center px-5 sm:px-6 py-5 md:py-8 flex flex-col">
          <div
            className="text-3xl sm:text-[2.25rem] leading-tight mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {candidate.initial}. · {candidate.age} {t.dashboard.years}
          </div>
          {candidate.location && (
            <div className="text-base mb-4" style={{ color: "var(--text-soft)" }}>
              {candidate.location}
            </div>
          )}

          {(candidate.is_verified || candidate.is_phone_verified) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-sm font-semibold" style={{ color: "var(--ok)" }}>
              {candidate.is_verified && <span>✓ {t.dashboard.trustIdentityLabel}</span>}
              {candidate.is_phone_verified && <span>✓ {t.dashboard.trustPhoneLabel}</span>}
            </div>
          )}

          <div className="mb-6">
            <WhyIntroduced lines={compatibility} t={t} />
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2.5">
              <form action={passOnCandidate.bind(null, candidate.id)} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:brightness-95"
                  style={{
                    background: "var(--bg-raised)",
                    border: "1px solid var(--line)",
                    color: "var(--text-soft)",
                  }}
                >
                  {t.dashboard.notForMe}
                </button>
              </form>
              <form action={expressInterest.bind(null, candidate.id)} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-px"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                  }}
                >
                  {t.dashboard.imInterested}
                </button>
              </form>
            </div>
            <Link
              href="/matches"
              className="text-xs font-semibold text-center"
              style={{ color: "var(--accent-strong)" }}
            >
              {t.dashboard.seeAllMatches}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
