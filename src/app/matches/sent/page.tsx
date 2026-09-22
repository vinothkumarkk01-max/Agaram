import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getProfilePhotoUrls } from "@/lib/photo";
import { CandidatePhoto } from "@/components/CandidatePhoto";

type SentInterest = {
  match_id: string;
  candidate_id: string;
  age: number;
  location: string | null;
  initial: string;
  is_verified: boolean;
  has_photo: boolean;
  is_phone_verified: boolean;
  status: "interest_sent" | "mutual";
  created_at: string;
};

export default async function SentInterestsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sent_interests");
  const { t } = await getDictionary();

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const sent = (data ?? []) as SentInterest[];

  if (!sent.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        {t.matches.noSent}
      </div>
    );
  }

  const photos = await getProfilePhotoUrls(
    supabase,
    sent.map((m) => ({ id: m.candidate_id, hasPhoto: m.has_photo }))
  );

  return (
    // Large photo cards, matching Received/Browse — founder feedback
    // (Sept 2026): every screen showing someone else's photo should
    // show it "as big as possible," not just Browse.
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sent.map((m) => (
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
            <div
              className="inline-block text-xs font-semibold rounded-full px-3 py-1.5"
              style={
                m.status === "mutual"
                  ? { background: "var(--ok-soft)", color: "var(--ok)" }
                  : { background: "var(--accent-soft)", color: "var(--accent-strong)" }
              }
            >
              {m.status === "mutual" ? t.matches.mutualSeeTab : t.matches.waitingResponse}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
