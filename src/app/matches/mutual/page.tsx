import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { setMatchFamilySharing } from "@/app/actions/family";
import { milestoneLabel, type MessageMilestone } from "@/lib/milestones";
import { getProfilePhotoUrls } from "@/lib/photo";
import { ProfilePhotoAvatar } from "@/components/ProfilePhotoAvatar";

type MutualMatch = {
  match_id: string;
  candidate_id: string;
  full_name: string | null;
  age: number;
  location: string | null;
  about_me: string | null;
  is_verified: boolean;
  has_photo: boolean;
  is_phone_verified: boolean;
  matched_at: string;
  is_unlocked: boolean;
  current_milestone: MessageMilestone | null;
};

export default async function MutualMatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc("get_mutual_matches");
  const { t } = await getDictionary();

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const mutuals = (data ?? []) as MutualMatch[];

  // The per-match "Share with family" toggle only makes sense to show
  // once there's actually a Family Collaborator to share with — and
  // only the toggle's current state needs a second query, since
  // get_mutual_matches() deliberately doesn't carry shared_with_family
  // (it's a candidate-only concern, not exposed to the other side of
  // the match).
  const [{ data: familyLink }, { data: sharingRows }] = await Promise.all([
    supabase
      .from("account_links")
      .select("status")
      .eq("owner_id", user?.id ?? "")
      .eq("status", "active")
      .maybeSingle(),
    mutuals.length
      ? supabase
          .from("matches")
          .select("id, shared_with_family")
          .in(
            "id",
            mutuals.map((m) => m.match_id)
          )
      : Promise.resolve({ data: [] as { id: string; shared_with_family: boolean }[] }),
  ]);
  const hasFamilyLink = Boolean(familyLink);
  const sharedById = new Map(
    (sharingRows ?? []).map((r) => [r.id, r.shared_with_family])
  );

  const photos = await getProfilePhotoUrls(
    supabase,
    mutuals.map((m) => ({ id: m.candidate_id, hasPhoto: m.has_photo }))
  );

  if (!mutuals.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        {t.matches.noMutual}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {mutuals.map((m) => {
        const shared = sharedById.get(m.match_id) ?? false;
        const shareToggle = hasFamilyLink && (
          <form action={setMatchFamilySharing.bind(null, m.match_id, !shared)}>
            <button
              type="submit"
              className="text-xs font-semibold"
              style={{ color: shared ? "var(--ok)" : "var(--text-soft)" }}
            >
              {shared ? `✓ ${t.family.sharedWithFamily}` : t.family.shareWithFamily}
            </button>
          </form>
        );

        return m.is_unlocked ? (
          <div
            key={m.match_id}
            className="rounded-2xl p-5"
            style={{ background: "var(--ok-soft)", border: "1px solid var(--line)" }}
          >
            <div className="flex items-center gap-3 mb-1">
              <ProfilePhotoAvatar
                url={photos.get(m.candidate_id)?.url}
                initial={m.full_name?.[0] ?? ""}
                size={44}
              />
              <div
                className="text-lg font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {m.full_name}
              </div>
            </div>
            <div className="text-xs mb-2" style={{ color: "var(--text-soft)" }}>
              {m.age} {t.dashboard.years}{m.location ? ` · ${m.location}` : ""}
              {m.is_verified ? ` · ${t.dashboard.identityVerified}` : ""}
              {m.is_phone_verified ? ` · ${t.dashboard.phoneVerified}` : ""}
            </div>
            {m.about_me && (
              <p className="text-sm italic mb-3" style={{ color: "var(--text)" }}>
                &ldquo;{m.about_me}&rdquo;
              </p>
            )}
            {m.current_milestone && (
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--ok)" }}>
                {t.matches.milestoneCurrentPrefix}
                {milestoneLabel(t, m.current_milestone)}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/matches/mutual/${m.match_id}`}
                className="inline-block rounded-xl py-2 px-4 font-bold text-white text-sm"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                }}
              >
                {t.matches.message}
              </Link>
              {shareToggle}
            </div>
          </div>
        ) : (
          <div
            key={m.match_id}
            className="rounded-2xl p-5"
            style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
          >
            <div className="flex items-center gap-3 mb-1">
              <ProfilePhotoAvatar url={photos.get(m.candidate_id)?.url} initial="" size={44} />
              <div
                className="text-lg font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t.matches.itsAMatch}
              </div>
            </div>
            <div className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
              {m.age} {t.dashboard.years}{m.location ? ` · ${m.location}` : ""}
              {m.is_verified ? ` · ${t.dashboard.identityVerified}` : ""}
              {m.is_phone_verified ? ` · ${t.dashboard.phoneVerified}` : ""}
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              {t.matches.upgradeToSeeMessage}
            </p>
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/upgrade"
                className="inline-block rounded-xl py-2.5 px-5 font-bold text-white text-sm"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                }}
              >
                {t.matches.upgradeToEliteBtn}
              </Link>
              {shareToggle}
            </div>
          </div>
        );
      })}
    </div>
  );
}
