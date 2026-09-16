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

  revalidatePath("/admin/reports");
}

export async function setVerificationStatus(
  profileId: string,
  status: "verified" | "failed"
) {
  const { supabase } = await requireAdmin();

  await supabase
    .from("identity_verifications")
    .update({
      status,
      verified_at: status === "verified" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId);

  revalidatePath("/admin/verifications");
}
