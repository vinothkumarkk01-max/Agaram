import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/email/digest";

export const dynamic = "force-dynamic";

/**
 * One-click "unsubscribe from the weekly digest" link that every
 * digest email carries — deliberately reachable with NO login, since
 * the whole point is that someone can opt out straight from their
 * inbox without having to sign back in first (the logged-in
 * equivalent is the toggle on /account, actions/account.ts's
 * toggleWeeklyDigest()). Trust here rests entirely on the HMAC token
 * (src/lib/email/digest.ts) matching the profile id in the link, the
 * same way the Razorpay webhook trusts its signature rather than any
 * session — never skip that check.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const profileId = url.searchParams.get("profile") ?? "";
  const token = url.searchParams.get("token") ?? "";

  if (!profileId || !token || !verifyUnsubscribeToken(profileId, token)) {
    return new Response(unsubscribePage(false), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ weekly_digest_opt_out: true, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  return new Response(unsubscribePage(true), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function unsubscribePage(success: boolean): string {
  const message = success
    ? "You've been unsubscribed from the weekly Agaramiya digest. You can turn it back on any time from your account settings."
    : "This unsubscribe link is invalid or has expired. You can manage weekly digest emails from your account settings instead.";
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 24px; color: #1a1a1a; text-align: center;">
    <p>${message}</p>
  </body>
</html>`;
}
