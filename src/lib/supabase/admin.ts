import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * The ONE place in this app that uses the Supabase "service_role" key
 * — every other client (server.ts, client.ts, middleware.ts) uses the
 * public anon key and is subject to RLS. This client bypasses RLS
 * entirely, so it must never be exposed to the browser and must never
 * act on anything other than the caller's own id.
 *
 * Used for a handful of things that genuinely can't go through a
 * member's own RLS-scoped session: actions/account.ts's
 * deleteAccount() (deleting a row from `auth.users`, which only the
 * Supabase Admin API can do — no regular Postgres role can be granted
 * that, since Supabase Auth manages that schema itself); the Razorpay
 * webhook route (api/webhooks/razorpay), which has no member session
 * at all; lib/push/send.ts's stale-subscription cleanup (deleting a
 * push_subscriptions row that belongs to the message RECIPIENT, not
 * whoever triggered the send); and the weekly-digest cron route
 * (api/cron/weekly-digest), which reads and writes across every
 * member's profile at once rather than one signed-in member's own
 * row. Every one of these runs with no member logged in, or needs to
 * touch a row that isn't the caller's own — exactly the two cases RLS
 * can't accommodate.
 *
 * SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix — it must never
 * reach client-side code) comes from Project Settings -> API in the
 * Supabase dashboard. Never import this file from a Client Component,
 * and never call anything on the returned client with an id that
 * didn't come from `supabase.auth.getUser()` in the same request.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY isn't set — account deletion isn't configured yet."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
