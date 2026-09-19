import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { buildDigestEmail, type DigestCounts } from "@/lib/email/digest";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// A member who hasn't had a digest sent in the last 6 days is due —
// gives a day of slack around the weekly cron schedule (vercel.json)
// without ever double-sending inside the same week if the route gets
// triggered twice.
const MIN_DAYS_BETWEEN_DIGESTS = 6;

type ProfileRow = {
  id: string;
  full_name: string;
  profile_type: "groom" | "bride";
  is_suspended: boolean;
  weekly_digest_opt_out: boolean;
  last_digest_sent_at: string | null;
  created_at: string;
};

/**
 * Weekly curated match digest (PRD §8, supabase/schema.sql Phase 20)
 * — the closest honest approximation of the "Friday 4pm, your 3
 * introductions" cadence this app can compute without a real
 * Jathagam/ML matching engine: an email summarizing new Browse
 * candidates, interests received, and unread mutual-match messages
 * since the member's own last digest.
 *
 * Triggered by Vercel Cron (see vercel.json) hitting this route on a
 * schedule. Vercel signs cron requests with an `Authorization: Bearer
 * ${CRON_SECRET}` header automatically once CRON_SECRET is set as a
 * project env var — checked below the same way the Razorpay webhook
 * checks its own signature, just simpler (a shared secret compare,
 * not HMAC-over-body, since Vercel doesn't sign the body here).
 *
 * Runs entirely through the service-role client (src/lib/supabase/
 * admin.ts) — there is no member session on a cron trigger, and this
 * reads/writes every member's profile in turn, not one signed-in
 * member's own row.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { sent: 0, reason: "CRON_SECRET not configured" },
      { status: 200 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_ADDRESS) {
    return Response.json(
      { sent: 0, reason: "Resend not configured" },
      { status: 200 }
    );
  }

  const admin = createAdminClient();
  const baseUrl = await getSiteOrigin();

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select(
      "id, full_name, profile_type, is_suspended, weekly_digest_opt_out, last_digest_sent_at, created_at"
    )
    .eq("is_suspended", false)
    .eq("weekly_digest_opt_out", false);

  if (profilesError) {
    return Response.json({ error: profilesError.message }, { status: 500 });
  }

  const now = new Date();
  const results = { sent: 0, skipped: 0, failed: 0 };

  for (const profile of (profiles ?? []) as ProfileRow[]) {
    const since = profile.last_digest_sent_at ?? profile.created_at;
    const sinceDate = new Date(since);
    const daysSinceLastDigest =
      (now.getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24);

    if (
      profile.last_digest_sent_at &&
      daysSinceLastDigest < MIN_DAYS_BETWEEN_DIGESTS
    ) {
      results.skipped++;
      continue;
    }

    try {
      const counts = await computeDigestCounts(admin, profile, since);
      const hasAnything =
        counts.newCandidates > 0 ||
        counts.interestsReceived > 0 ||
        counts.unreadMessages > 0;

      if (hasAnything) {
        const { data: userResult } = await admin.auth.admin.getUserById(
          profile.id
        );
        const email = userResult?.user?.email;
        if (email) {
          const { subject, html, text } = buildDigestEmail({
            fullName: profile.full_name,
            counts,
            profileId: profile.id,
            baseUrl,
          });
          const result = await sendEmail({ to: email, subject, html, text });
          if (result.sent) {
            results.sent++;
          } else {
            results.failed++;
          }
        } else {
          results.failed++;
        }
      } else {
        results.skipped++;
      }

      // Advance the "since" watermark whether or not there was
      // anything to report — otherwise a quiet week just makes next
      // week's window twice as wide instead of resetting.
      await admin
        .from("profiles")
        .update({ last_digest_sent_at: now.toISOString() })
        .eq("id", profile.id);
    } catch {
      results.failed++;
    }
  }

  return Response.json(results, { status: 200 });
}

async function computeDigestCounts(
  admin: ReturnType<typeof createAdminClient>,
  profile: ProfileRow,
  since: string
): Promise<DigestCounts> {
  // --- New candidates (mirrors get_match_candidates()'s filters,
  // supabase/schema.sql Phase 4, but service-role can't call that
  // function since it relies on auth.uid() — so the same filters are
  // re-applied directly against the tables here) ---
  const [{ data: matchRows }, { data: blockRows }, { data: prefsRow }] =
    await Promise.all([
      admin
        .from("matches")
        .select("candidate_a, candidate_b")
        .or(`candidate_a.eq.${profile.id},candidate_b.eq.${profile.id}`),
      admin
        .from("blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${profile.id},blocked_id.eq.${profile.id}`),
      admin
        .from("preferences")
        .select("age_min, age_max, preferred_locations")
        .eq("profile_id", profile.id)
        .maybeSingle(),
    ]);

  const excludedIds = new Set<string>([profile.id]);
  for (const m of matchRows ?? []) {
    excludedIds.add(m.candidate_a === profile.id ? m.candidate_b : m.candidate_a);
  }
  for (const b of blockRows ?? []) {
    excludedIds.add(b.blocker_id === profile.id ? b.blocked_id : b.blocker_id);
  }

  const ageMin = prefsRow?.age_min ?? 18;
  const ageMax = prefsRow?.age_max ?? 100;
  const preferredLocations = (prefsRow?.preferred_locations ?? []).map((l: string) =>
    l.toLowerCase()
  );

  let candidateQuery = admin
    .from("profiles")
    .select("id, location")
    .neq("profile_type", profile.profile_type)
    .eq("is_suspended", false)
    .gt("created_at", since)
    .gte("age", ageMin)
    .lte("age", ageMax);

  if (excludedIds.size > 0) {
    candidateQuery = candidateQuery.not(
      "id",
      "in",
      `(${Array.from(excludedIds).join(",")})`
    );
  }

  const { data: candidateRows } = await candidateQuery;
  const newCandidates = (candidateRows ?? []).filter((c) => {
    if (preferredLocations.length === 0) return true;
    return (
      typeof c.location === "string" &&
      preferredLocations.includes(c.location.toLowerCase())
    );
  }).length;

  // --- Interests received since last digest ---
  const { count: interestsReceived } = await admin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`candidate_a.eq.${profile.id},candidate_b.eq.${profile.id}`)
    .eq("status", "interest_sent")
    .neq("initiated_by", profile.id)
    .gt("created_at", since);

  // --- Unread messages across mutual matches (all-time unread, not
  // windowed by `since` — an unread message from before last digest
  // is still worth surfacing, not just new ones) ---
  const { data: mutualMatches } = await admin
    .from("matches")
    .select("id")
    .or(`candidate_a.eq.${profile.id},candidate_b.eq.${profile.id}`)
    .eq("status", "mutual");

  let unreadMessages = 0;
  for (const match of mutualMatches ?? []) {
    const { data: readState } = await admin
      .from("message_read_state")
      .select("last_read_at")
      .eq("match_id", match.id)
      .eq("profile_id", profile.id)
      .maybeSingle();

    const lastReadAt = readState?.last_read_at ?? profile.created_at;

    const { count } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("match_id", match.id)
      .neq("sender_id", profile.id)
      .gt("created_at", lastReadAt);

    unreadMessages += count ?? 0;
  }

  return {
    newCandidates,
    interestsReceived: interestsReceived ?? 0,
    unreadMessages,
  };
}
