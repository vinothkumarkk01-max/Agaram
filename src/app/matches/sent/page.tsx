import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { getProfilePhotoUrls } from "@/lib/photo";
import { ProfilePhotoAvatar } from "@/components/ProfilePhotoAvatar";

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
    <div className="flex flex-col gap-3">
      {sent.map((m) => (
        <div
          key={m.match_id}
          className="rounded-2xl p-5 flex items-center justify-between gap-4"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <div className="flex items-center gap-4">
            <ProfilePhotoAvatar
              url={photos.get(m.candidate_id)?.url}
              initial={`${m.initial}.`}
              size={64}
            />
            <div>
              <div className="text-sm font-semibold">
                {m.age} {t.dashboard.years}{m.location ? ` · ${m.location}` : ""}
              </div>
              {m.is_verified && (
                <div
                  className="text-xs font-semibold mt-1"
                  style={{ color: "var(--ok)" }}
                >
                  {t.dashboard.identityVerified}
                </div>
              )}
              {m.is_phone_verified && (
                <div
                  className="text-xs font-semibold mt-1"
                  style={{ color: "var(--ok)" }}
                >
                  {t.dashboard.phoneVerified}
                </div>
              )}
            </div>
          </div>
          <div
            className="text-xs font-semibold rounded-full px-3 py-1.5 shrink-0"
            style={
              m.status === "mutual"
                ? { background: "var(--ok-soft)", color: "var(--ok)" }
                : { background: "var(--accent-soft)", color: "var(--accent-strong)" }
            }
          >
            {m.status === "mutual" ? t.matches.mutualSeeTab : t.matches.waitingResponse}
          </div>
        </div>
      ))}
    </div>
  );
}
