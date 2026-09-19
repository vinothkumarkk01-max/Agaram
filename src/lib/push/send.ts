import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sends one push notification, best-effort, using web-push and the
 * VAPID keypair below (generate your own with `npx web-push
 * generate-vapid-keys` — see README). Never throws: a member's push
 * subscription going stale, or push not being configured at all, is
 * routine, not a bug, and must never take down message sending
 * itself (see actions/messages.ts, where this is called
 * fire-and-forget after the message insert already succeeded).
 *
 * A 404/410 from the push service means that browser subscription is
 * dead (the user cleared site data, uninstalled, revoked permission,
 * ...) — this deletes it via the service-role client so it stops
 * being retried forever. Deleting here rather than through the
 * member's own RLS policy is deliberate: this runs on behalf of
 * whoever is RECEIVING the notification, not whoever triggered it.
 */
export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string }
): Promise<void> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return; // Push notifications aren't configured — silently skip.
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number } | null)?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      try {
        const admin = createAdminClient();
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      } catch {
        // Service-role key not configured — leave the stale row in
        // place rather than crashing; it'll just fail again next time.
      }
    }
    // Any other failure (network blip, push service hiccup) is just
    // a missed notification, not something worth surfacing to the
    // sender — they already saw their message send successfully.
  }
}
