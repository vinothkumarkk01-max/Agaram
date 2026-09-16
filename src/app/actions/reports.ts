"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Files a report against the other person in a mutual-match
 * conversation. The reported person is derived from the match row
 * itself (never trusted from form input), and the insert RLS policy
 * (supabase/schema.sql) requires reporter_id = auth.uid() regardless.
 * Invalid submissions are silent no-ops (same pattern as the other
 * bound-form actions in this app, e.g. actions/matches.ts) — the
 * report page itself only ever renders a valid form.
 */
export async function reportMember(matchId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason || reason.length > 2000) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select("id, candidate_a, candidate_b, status")
    .eq("id", matchId)
    .maybeSingle();

  if (
    !match ||
    match.status !== "mutual" ||
    (match.candidate_a !== user.id && match.candidate_b !== user.id)
  ) {
    return;
  }

  const reportedId =
    match.candidate_a === user.id ? match.candidate_b : match.candidate_a;

  await supabase.from("reports").insert({
    match_id: matchId,
    reporter_id: user.id,
    reported_id: reportedId,
    reason,
  });

  revalidatePath(`/matches/mutual/${matchId}/report`);
  revalidatePath("/admin/reports");
}
