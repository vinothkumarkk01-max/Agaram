"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { buildNewInterestEmail, buildNewMatchEmail } from "@/lib/email/alerts";
import { getSiteOrigin } from "@/lib/site-url";

/**
 * Matches are stored one row PER PAIR, never per direction —
 * candidate_a is always the lexicographically-smaller UUID (matches
 * the `matches_pair_order` check constraint in supabase/schema.sql),
 * so a pair can never end up with two rows no matter who acts first.
 */
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function revalidateMatches() {
  revalidatePath("/matches");
  revalidatePath("/matches/sent");
  revalidatePath("/matches/received");
  revalidatePath("/matches/mutual");
}

/**
 * Masked view of one profile, exactly the fields get_received_interests()
 * / get_mutual_matches() already expose regardless of the viewer's own
 * subscription tier — used to build the "new interest" / "new match"
 * instant-alert emails without going through the auth.uid()-scoped RPCs
 * (there's no signed-in session for the OTHER participant to run them
 * as), while never surfacing anything those RPCs wouldn't.
 */
type MaskedProfile = {
  full_name: string;
  age: number;
  location: string | null;
  is_verified: boolean;
  instant_alerts_opt_out: boolean;
  is_suspended: boolean;
};

async function loadMaskedProfile(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string
): Promise<MaskedProfile | null> {
  const [{ data: profile }, { data: verification }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, age, location, instant_alerts_opt_out, is_suspended")
      .eq("id", profileId)
      .maybeSingle(),
    admin
      .from("identity_verifications")
      .select("status")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);

  if (!profile) return null;

  return {
    full_name: profile.full_name,
    age: profile.age,
    location: profile.location,
    is_verified: verification?.status === "verified",
    instant_alerts_opt_out: profile.instant_alerts_opt_out,
    is_suspended: profile.is_suspended,
  };
}

/**
 * Every instant-alert send is best-effort and MUST NEVER throw back
 * into the caller — a Resend outage, a missing env var, or an
 * unexpected DB hiccup here should never turn expressing interest or
 * accepting a match into a failed action for the member. Every path
 * below is wrapped accordingly; failures are simply swallowed, same
 * spirit as lib/push/send.ts's best-effort push notifications.
 */
async function notifyNewInterest(recipientId: string, senderId: string) {
  try {
    const admin = createAdminClient();
    const recipient = await loadMaskedProfile(admin, recipientId);
    if (!recipient || recipient.is_suspended || recipient.instant_alerts_opt_out) {
      return;
    }
    const sender = await loadMaskedProfile(admin, senderId);
    if (!sender) return;

    const { data: userResult } = await admin.auth.admin.getUserById(recipientId);
    const email = userResult?.user?.email;
    if (!email) return;

    const baseUrl = await getSiteOrigin();
    const { subject, html, text } = buildNewInterestEmail({
      fullName: recipient.full_name,
      baseUrl,
      profileId: recipientId,
      sender: {
        age: sender.age,
        location: sender.location,
        is_verified: sender.is_verified,
      },
    });
    await sendEmail({ to: email, subject, html, text });
  } catch {
    // Best-effort — see the function comment above.
  }
}

async function notifyNewMutualMatch(profileIdA: string, profileIdB: string) {
  try {
    const admin = createAdminClient();
    const baseUrl = await getSiteOrigin();
    const pairs: Array<[string, string]> = [
      [profileIdA, profileIdB],
      [profileIdB, profileIdA],
    ];

    for (const [recipientId, otherId] of pairs) {
      const recipient = await loadMaskedProfile(admin, recipientId);
      if (!recipient || recipient.is_suspended || recipient.instant_alerts_opt_out) {
        continue;
      }
      const other = await loadMaskedProfile(admin, otherId);
      if (!other) continue;

      const { data: userResult } = await admin.auth.admin.getUserById(recipientId);
      const email = userResult?.user?.email;
      if (!email) continue;

      const { subject, html, text } = buildNewMatchEmail({
        fullName: recipient.full_name,
        baseUrl,
        profileId: recipientId,
        other: { age: other.age, location: other.location },
      });
      await sendEmail({ to: email, subject, html, text });
    }
  } catch {
    // Best-effort — see notifyNewInterest's comment above.
  }
}

/**
 * Express interest in a candidate from the browse feed. If they had
 * already expressed interest in me first, this completes the mutual
 * match right away instead of creating a second, redundant row.
 */
export async function expressInterest(candidateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [candidate_a, candidate_b] = orderPair(user.id, candidateId);

  const { data: existing } = await supabase
    .from("matches")
    .select("id, status, initiated_by")
    .eq("candidate_a", candidate_a)
    .eq("candidate_b", candidate_b)
    .maybeSingle();

  if (!existing) {
    await supabase.from("matches").insert({
      candidate_a,
      candidate_b,
      initiated_by: user.id,
      status: "interest_sent",
    });
    await notifyNewInterest(candidateId, user.id);
  } else if (
    existing.status === "interest_sent" &&
    existing.initiated_by !== user.id
  ) {
    // They already expressed interest in me — this completes a mutual match.
    await supabase
      .from("matches")
      .update({ status: "mutual", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    await notifyNewMutualMatch(user.id, candidateId);
  } else if (existing.status === "declined") {
    // Re-surfaced after the 30-day cooldown (supabase/schema.sql,
    // Phase 24 — get_match_candidates() only shows a declined pair
    // again once it's old enough), so the only way this branch is
    // reached is via a fresh Browse card, not a stale one. Restart the
    // interest cycle on the SAME row rather than inserting a new one —
    // a second row for the same pair would violate the
    // matches_unique_pair constraint.
    await supabase
      .from("matches")
      .update({
        status: "interest_sent",
        initiated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    await notifyNewInterest(candidateId, user.id);
  }
  // Otherwise (already sent by me, or already mutual) there's nothing
  // to do — left as a no-op.

  revalidateMatches();
}

/** Pass on a candidate — closes the pair permanently for both sides. */
export async function passOnCandidate(candidateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [candidate_a, candidate_b] = orderPair(user.id, candidateId);

  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("candidate_a", candidate_a)
    .eq("candidate_b", candidate_b)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("matches")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("matches").insert({
      candidate_a,
      candidate_b,
      initiated_by: user.id,
      status: "declined",
    });
  }

  revalidateMatches();
}

/**
 * Accept or decline an interest someone else sent me. Only the
 * recipient (never the original sender) can call this on a given row.
 */
export async function respondToInterest(matchId: string, accept: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select("id, initiated_by, candidate_a, candidate_b, status")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return;

  const isRecipient =
    (match.candidate_a === user.id || match.candidate_b === user.id) &&
    match.initiated_by !== user.id;

  if (!isRecipient || match.status !== "interest_sent") return;

  await supabase
    .from("matches")
    .update({
      status: accept ? "mutual" : "declined",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (accept) {
    await notifyNewMutualMatch(match.candidate_a, match.candidate_b);
  }

  revalidateMatches();
}
