"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMessageMilestone, type MessageMilestone } from "@/lib/milestones";
import { sendPushNotification } from "@/lib/push/send";

/**
 * Push-notifies the OTHER match participant about a new message —
 * best-effort, never lets a push failure affect whether the message
 * itself was sent (see sendMessage below, which has already returned
 * success by the time this even starts). get_push_subscriptions_for_
 * match_peer() (Phase 15, supabase/schema.sql) is a SECURITY DEFINER
 * function scoped so it only ever returns the OTHER participant's
 * rows, and only for a match the caller (the sender) is actually
 * part of.
 */
async function notifyOtherParticipant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  senderName: string
) {
  const { data: subscriptions } = await supabase.rpc(
    "get_push_subscriptions_for_match_peer",
    { p_match_id: matchId }
  );

  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      sendPushNotification(sub, {
        title: `New message from ${senderName}`,
        body: "Open Agaram to read it.",
        url: `/matches/mutual/${matchId}`,
      })
    )
  );
}

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

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  await notifyOtherParticipant(supabase, matchId, senderProfile?.full_name ?? "your match");

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
