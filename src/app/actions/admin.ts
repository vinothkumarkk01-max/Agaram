"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Every function here re-checks is_admin itself (in addition to the
 * RLS policies in supabase/schema.sql that are the real enforcement)
 * so a stray call from a non-admin session fails fast with a plain
 * message instead of a raw Postgres/RLS error.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/dashboard");

  return { supabase, user };
}

/**
 * Writes one row to the admin_actions audit log (Phase 16,
 * supabase/schema.sql) — always through the admin's own session
 * (never a service-role key or SECURITY DEFINER function), so
 * admin_id is genuinely whoever was signed in. Best-effort: a logging
 * failure here is never allowed to undo or block the action it's
 * describing, since the action itself has usually already committed
 * by the time this runs.
 */
async function logAdminAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  detail?: string
) {
  await supabase.from("admin_actions").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    detail: detail ?? null,
  });
}

export async function resolveReport(reportId: string) {
  const { supabase, user } = await requireAdmin();

  await supabase
    .from("reports")
    .update({
      status: "resolved",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  await logAdminAction(supabase, user.id, "resolved_report", "report", reportId);

  revalidatePath("/admin/reports");
}

export async function setVerificationStatus(
  profileId: string,
  status: "verified" | "failed"
) {
  const { supabase, user } = await requireAdmin();

  await supabase
    .from("identity_verifications")
    .update({
      status,
      verified_at: status === "verified" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId);

  await logAdminAction(
    supabase,
    user.id,
    status === "verified" ? "verified_member" : "failed_verification",
    "profile",
    profileId
  );

  revalidatePath("/admin/verifications");
}

/**
 * Logs the report's match id and redirects to the read-only
 * conversation view (src/app/admin/reports/[id]/messages/page.tsx) —
 * reading someone else's private messages is exactly the kind of
 * action that most needs a record, so this logs BEFORE the redirect,
 * not as a side effect of rendering the page itself.
 */
export async function viewReportMessages(reportId: string) {
  const { supabase, user } = await requireAdmin();

  const { data: report } = await supabase
    .from("reports")
    .select("match_id")
    .eq("id", reportId)
    .maybeSingle();

  if (report?.match_id) {
    await logAdminAction(
      supabase,
      user.id,
      "viewed_messages",
      "match",
      report.match_id,
      `Investigating report ${reportId}`
    );
  }

  redirect(`/admin/reports/${reportId}/messages`);
}

export type SuspendMemberState = { error: string } | undefined;

/**
 * Suspending always requires a reason (so there's a record of why,
 * for your own future reference — V0 has no separate audit log, this
 * is it), which is why this one goes through useActionState + a form
 * rather than a plain bound button like unsuspendMember below. Writes
 * through set_member_suspended() (supabase/schema.sql, Phase 12) —
 * never a direct .update() — since is_suspended/suspended_at/
 * suspended_reason are revoked from ordinary authenticated writes,
 * same treatment as is_admin/subscription_tier.
 */
export async function suspendMember(
  _prevState: SuspendMemberState,
  formData: FormData
): Promise<SuspendMemberState> {
  const { supabase, user } = await requireAdmin();

  const profileId = String(formData.get("profile_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!profileId) {
    return { error: "Missing profile id." };
  }
  if (!reason) {
    return { error: "Add a short reason before suspending." };
  }

  const { error } = await supabase.rpc("set_member_suspended", {
    p_profile_id: profileId,
    p_suspended: true,
    p_reason: reason,
  });
  if (error) {
    return { error: error.message };
  }

  await logAdminAction(supabase, user.id, "suspended_member", "profile", profileId, reason);

  revalidatePath("/admin/members");
  return undefined;
}

export async function unsuspendMember(profileId: string) {
  const { supabase, user } = await requireAdmin();

  await supabase.rpc("set_member_suspended", {
    p_profile_id: profileId,
    p_suspended: false,
  });

  await logAdminAction(supabase, user.id, "unsuspended_member", "profile", profileId);

  revalidatePath("/admin/members");
}
