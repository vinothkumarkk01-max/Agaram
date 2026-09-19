"use server";

import { createClient } from "@/lib/supabase/server";

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type SavePushSubscriptionResult = { success: true } | { error: string };

/**
 * Records a browser's push subscription, obtained client-side via
 * PushManager.subscribe() right after the member turns on
 * notifications (see NotificationsToggle.tsx). Runs through the
 * member's own session — the RLS policy on push_subscriptions (Phase
 * 15, supabase/schema.sql) only lets them write rows with their own
 * profile_id anyway, but the check here gives a readable error
 * instead of a raw Postgres one.
 */
export async function savePushSubscription(
  subscription: PushSubscriptionInput
): Promise<SavePushSubscriptionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in first." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profile_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return { error: error.message };
  }
  return { success: true };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
