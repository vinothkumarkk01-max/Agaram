import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/email/digest";

export const dynamic = "force-dynamic";

/**
 * One-click "unsubscribe from instant alerts" link every new-interest/
 * new-match email carries — same no-login shape as
 * /api/digest/unsubscribe, and deliberately verified with the exact
 * same HMAC helper (see lib/email/alerts.ts and the Phase 27 schema
 * comment for why reusing DIGEST_UNSUB_SECRET here is fine). This
 * route only ever flips instant_alerts_opt_out — weekly_digest_opt_out
 * is untouched, since the two preferences are independent.
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
    .update({ instant_alerts_opt_out: true, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  return new Response(unsubscribePage(true), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function unsubscribePage(success: boolean): string {
  const message = success
    ? "You've been unsubscribed from instant Agaram alerts (new interest / new match emails). You can turn them back on any time from your account settings."
    : "This unsubscribe link is invalid or has expired. You can manage instant alerts from your account settings instead.";
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 24px; color: #1a1a1a; text-align: center;">
    <p>${message}</p>
  </body>
</html>`;
}
