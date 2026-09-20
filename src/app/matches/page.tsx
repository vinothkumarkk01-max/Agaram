import { createClient } from "@/lib/supabase/server";
import { CandidateCard, type MaskedCandidate } from "@/components/CandidateCard";
import { getDictionary } from "@/lib/i18n/server";
import { getProfilePhotoUrls } from "@/lib/photo";
import { buildMatchReasons, buildCompatibilityBreakdown } from "@/lib/matchReasons";

export default async function BrowseMatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: candidates, error } = await supabase.rpc(
    "get_match_candidates"
  );
  const { t } = await getDictionary();

  const { data: myPreferences } = user
    ? await supabase
        .from("preferences")
        .select(
          "age_min, age_max, preferred_locations, family_type_preference, diet_preference, native_district_preference, community_preference"
        )
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const list = (candidates ?? []) as MaskedCandidate[];

  if (!list.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        {t.matches.noCandidates}
      </div>
    );
  }

  const photos = await getProfilePhotoUrls(
    supabase,
    list.map((c) => ({ id: c.id, hasPhoto: c.has_photo }))
  );

  return (
    <div className="flex flex-col gap-3">
      {list.map((candidate) => (
        <CandidateCard
          key={candidate.id}
          candidate={candidate}
          photoUrl={photos.get(candidate.id)?.url}
          reasons={
            myPreferences ? buildMatchReasons(t, candidate, myPreferences) : undefined
          }
          compatibility={
            myPreferences ? buildCompatibilityBreakdown(t, candidate, myPreferences) : undefined
          }
          t={t}
        />
      ))}
    </div>
  );
}
