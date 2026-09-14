"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  } else if (
    existing.status === "interest_sent" &&
    existing.initiated_by !== user.id
  ) {
    // They already expressed interest in me — this completes a mutual match.
    await supabase
      .from("matches")
      .update({ status: "mutual", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  }
  // Otherwise (already sent by me, already mutual, or already
  // declined) there's nothing to do — left as a no-op.

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

  revalidateMatches();
}
