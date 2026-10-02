import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fire-and-forget failure logging for /admin/failures (Phase 34,
 * supabase/schema.sql). Call this from a catch block or an error
 * branch the moment the app itself observes something go wrong that
 * it already has code to detect — a Razorpay signature mismatch, an
 * RPC error, a failed Resend send. It deliberately never throws: a
 * broken failure-logger must never turn a handled error into an
 * unhandled one, so every failure here is swallowed after one
 * console.error (still visible in Vercel's own runtime logs even if
 * the row never makes it into Postgres).
 *
 * `detail` is optional structured context — keep it to non-sensitive
 * fields (ids, status codes, short error strings), never secrets or
 * a member's private data beyond what admins can already see
 * elsewhere in /admin.
 */
export async function logFailure(params: {
  source: string;
  message: string;
  detail?: Record<string, unknown>;
  profileId?: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const environment = process.env.VERCEL_ENV === "production" ? "production" : "preview";

    const { error } = await admin.from("app_failure_logs").insert({
      environment,
      source: params.source,
      message: params.message,
      detail: params.detail ?? null,
      profile_id: params.profileId ?? null,
    });

    if (error) {
      console.error("[failureLog] could not write app_failure_logs row:", error.message);
    }
  } catch (err) {
    console.error(
      "[failureLog] logFailure itself failed:",
      err instanceof Error ? err.message : err
    );
  }
}
