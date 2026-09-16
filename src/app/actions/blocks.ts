"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function revalidateMatches() {
  revalidatePath("/matches");
  revalidatePath("/matches/sent");
  revalidatePath("/matches/received");
  revalidatePath("/matches/mutual");
  revalidatePath("/account");
}

/**
 * Blocks another member — see supabase/schema.sql's Phase 9 comment
 * for why this exists alongside the already-permanent effect of
 * declining a match. Also closes out any existing match between the
 * two of you (so it disappears from Sent/Received/Mutual right away,
 * rather than only being caught by the blocks-aware checks added to
 * get_match_candidates() / get_mutual_matches() / get_match_thread() /
 * the messages policy — those remain the real, permanent guard; this
 * is just keeping the UI in sync immediately).
 */
export async function blockMember(candidateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: user.id, blocked_id: candidateId });

  // A unique-violation here just means you'd already blocked them —
  // fine, keep going and make sure the match is still closed out too.
  if (error && error.code !== "23505") {
    return;
  }

  const [candidate_a, candidate_b] = orderPair(user.id, candidateId);
  await supabase
    .from("matches")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("candidate_a", candidate_a)
    .eq("candidate_b", candidate_b)
    .neq("status", "declined");

  revalidateMatches();
}

/**
 * Removes a block. Does NOT revive whatever match existed before the
 * block — that was already permanently declined (see blockMember
 * above and the schema comment), and this app has no "un-decline"
 * mechanism. Unblocking just stops actively suppressing someone and
 * removes them from your own "Blocked members" list.
 */
export async function unblockMember(candidateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", candidateId);

  revalidatePath("/account");
}
