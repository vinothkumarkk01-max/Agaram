import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MessageThread } from "@/components/MessageThread";
import { blockMember } from "@/app/actions/blocks";
import { getDictionary } from "@/lib/i18n/server";
import { getProfilePhotoUrl } from "@/lib/photo";
import { ProfilePhotoAvatar } from "@/components/ProfilePhotoAvatar";

type MatchThread = {
  match_id: string;
  candidate_id: string;
  full_name: string | null;
  age: number;
  location: string | null;
  is_verified: boolean;
  has_photo: boolean;
  is_phone_verified: boolean;
  is_unlocked: boolean;
};

export default async function MatchThreadPage({
  params,
}: PageProps<"/matches/mutual/[matchId]">) {
  const { matchId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // the /matches layout already redirects signed-out users
  const { t } = await getDictionary();

  const { data, error } = await supabase.rpc("get_match_thread", {
    p_match_id: matchId,
  });

  const thread = (data?.[0] ?? null) as MatchThread | null;

  if (error || !thread) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        {t.matches.conversationUnavailable}{" "}
        <Link href="/matches/mutual" className="underline font-semibold">
          {t.matches.backToMutual}
        </Link>
      </div>
    );
  }

  if (!thread.is_unlocked) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        <p className="mb-4" style={{ color: "var(--text-soft)" }}>
          {t.matches.upgradeToMessage}
        </p>
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
      </div>
    );
  }

  const photo = await getProfilePhotoUrl(supabase, thread.candidate_id, thread.has_photo);

  // RLS (supabase/schema.sql, Phase 26) already does the deciding here:
  // this only returns a row when the other member both filled theirs
  // in AND set visibility to 'mutual_match' — no separate check needed.
  const { data: jathagam } = await supabase
    .from("jathagam_details")
    .select("birth_star, rasi, birth_place")
    .eq("profile_id", thread.candidate_id)
    .maybeSingle();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, milestone")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col" style={{ height: "70vh" }}>
      <Link
        href="/matches/mutual"
        className="text-xs font-semibold mb-3 inline-block"
        style={{ color: "var(--text-soft)" }}
      >
        {t.matches.backMutual}
      </Link>

      <div
        className="flex items-start justify-between gap-3 mb-3 pb-3"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-3">
          <ProfilePhotoAvatar url={photo?.url} initial={thread.full_name?.[0] ?? ""} size={40} />
          <div>
            <div
              className="text-lg font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {thread.full_name}
            </div>
            <div className="text-xs" style={{ color: "var(--text-soft)" }}>
              {thread.age} {t.dashboard.years}{thread.location ? ` · ${thread.location}` : ""}
              {thread.is_verified ? ` · ${t.dashboard.identityVerified}` : ""}
              {thread.is_phone_verified ? ` · ${t.dashboard.phoneVerified}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/matches/mutual/${matchId}/report`}
            className="text-xs font-semibold"
            style={{ color: "var(--text-soft)" }}
          >
            {t.matches.report}
          </Link>
          <form action={blockMember.bind(null, thread.candidate_id)}>
            <button
              type="submit"
              className="text-xs font-semibold"
              style={{ color: "var(--accent-strong)" }}
            >
              {t.matches.block}
            </button>
          </form>
        </div>
      </div>

      {jathagam && (jathagam.birth_star || jathagam.rasi || jathagam.birth_place) && (
        <div
          className="text-xs rounded-xl p-3 mb-3"
          style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
        >
          <span className="font-semibold" style={{ color: "var(--text)" }}>
            {t.account.jathagamSharedHeading}
          </span>{" "}
          {[jathagam.birth_star, jathagam.rasi, jathagam.birth_place].filter(Boolean).join(" · ")}
        </div>
      )}

      <MessageThread
        matchId={matchId}
        currentUserId={user.id}
        initialMessages={messages ?? []}
        t={t}
      />
    </div>
  );
}
