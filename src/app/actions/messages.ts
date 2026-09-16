"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
