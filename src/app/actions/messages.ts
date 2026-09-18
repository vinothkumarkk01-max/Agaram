"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMessageMilestone, type MessageMilestone } from "@/lib/milestones";

export type SendMessageResult = { success: true } | { error: string };

/**
 * Sends a message in a mutual-match thread. The real gate is the
 * `messages` insert RLS policy in supabase/schema.sql — sender must
 * be a match participant, the match must be mutual, and the sender's
 * own subscription must be active Elite. This action just makes the
 * failure readable instead of a raw Postgres error.
 */
export async function sendMessage(
  matchId: string,
  body: string
): Promise<SendMessageResult> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { error: "Message can't be empty." };
  }
  if (trimmed.length > 2000) {
    return { error: "That message is too long (2000 characters max)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("messages").insert({
    match_id: matchId,
    sender_id: user.id,
    body: trimmed,
  });

  if (error) {
    return {
      error:
        "Couldn't send that — make sure this is a mutual match and your Elite subscription is active.",
    };
  }

  revalidatePath(`/matches/mutual/${matchId}`);
  return { success: true };
}

export type SetMilestoneResult = { success: true } | { error: string };

/**
 * Tags this conversation's current stage (PRD §8/§12). A milestone
 * "message" is inserted through the exact same messages-insert RLS
 * policy as sendMessage above (participant + mutual + active Elite +
 * not blocked) — there's no separate permission model for it. `body`
 * is set to the milestone code itself, purely to satisfy the
 * not-empty column check; the thread never displays it, rendering the
 * localized stage label instead whenever `milestone` is set.
 */
export async function setMilestone(
  matchId: string,
  milestone: MessageMilestone
): Promise<SetMilestoneResult> {
  if (!isMessageMilestone(milestone)) {
    return { error: "Not a recognized stage." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("messages").insert({
    match_id: matchId,
    sender_id: user.id,
    body: milestone,
    milestone,
  });

  if (error) {
    return {
      error:
        "Couldn't mark that stage — make sure this is a mutual match and your Elite subscription is active.",
    };
  }

  revalidatePath(`/matches/mutual/${matchId}`);
  revalidatePath("/matches/mutual");
  revalidatePath("/family");
  return { success: true };
}
