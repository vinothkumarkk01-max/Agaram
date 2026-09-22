import { createClient } from "@/lib/supabase/server";
import { respondToInterest } from "@/app/actions/matches";
import { blockMember } from "@/app/actions/blocks";
import { getDictionary } from "@/lib/i18n/server";
import { getProfilePhotoUrls } from "@/lib/photo";
import { CandidatePhoto } from "@/components/CandidatePhoto";

type ReceivedInterest = {
  match_id: string;
  candidate_id: string;
  age: number;
  location: string | null;
  initial: string;
  is_verified: boolean;
  has_photo: boolean;
  is_phone_verified: boolean;
  created_at: string;
};

export default async function ReceivedInterestsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_received_interests");
  const { t } = await getDictionary();

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const received = (data ?? []) as ReceivedInterest[];

  if (!received.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        {t.matches.noReceived}
      </div>
    );
  }

  const photos = await getProfilePhotoUrls(
    supabase,
    received.map((m) => ({ id: m.candidate_id, hasPhoto: m.has_photo }))
  );

  return (
    // Large photo cards, not a compact icon-and-text list — founder
    // feedback (Sept 2026): every screen showing someone else's photo
    // should show it "as big as possible," not just Browse. Same card
    // shape as CandidateCard, adapted for accept/decline instead of
    // pass/interested.
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {received.map((m) => (
        <div
          key={m.match_id}
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <CandidatePhoto
            url={photos.get(m.candidate_id)?.url}
            isOriginal={photos.get(m.candidate_id)?.isOriginal}
            initial={`${m.initial}.`}
            privacyLabel={t.matches.privateUntilMutual}
          />
          <div className="p-5">
            <div className="text-base font-semibold mb-2">
              {m.age} {t.dashboard.years}
              {m.location ? ` · ${m.location}` : ""}
            </div>
            {(m.is_verified || m.is_phone_verified) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {m.is_verified && (
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-1"
                    style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
                  >
                    {t.dashboard.identityVerified}
                  </span>
                )}
                {m.is_phone_verified && (
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-1"
                    style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
                  >
                    {t.dashboard.phoneVerified}
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-2 mb-2">
              <form action={respondToInterest.bind(null, m.match_id, false)} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                  style={{
                    background: "var(--bg-raised)",
                    border: "1px solid var(--line)",
                    color: "var(--text-soft)",
                  }}
                >
                  {t.matches.decline}
                </button>
              </form>
              <form action={respondToInterest.bind(null, m.match_id, true)} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                  }}
                >
                  {t.matches.accept}
                </button>
              </form>
            </div>
            <form action={blockMember.bind(null, m.candidate_id)}>
              <button
                type="submit"
                className="text-xs font-semibold"
                style={{ color: "var(--text-soft)" }}
              >
                {t.matches.block}
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
