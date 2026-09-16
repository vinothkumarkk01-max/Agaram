import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * The ONE place in this app that uses the Supabase "service_role" key
 * — every other client (server.ts, client.ts, middleware.ts) uses the
 * public anon key and is subject to RLS. This client bypasses RLS
 * entirely, so it must never be exposed to the browser and must never
 * act on anything other than the caller's own id.
 *
 * Used for exactly one thing today: actions/account.ts's
 * deleteAccount(), which needs to delete a row from `auth.users` — an
 * operation only the Supabase Admin API can do; there's no RLS policy
 * that could grant a regular user permission to delete their own auth
 * account, because deleting from `auth.users` isn't something a
 * regular Postgres role can be granted at all (Supabase Auth manages
 * that schema itself).
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
