"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function revalidateFamily() {
  revalidatePath("/account");
  revalidatePath("/family");
  revalidatePath("/dashboard");
  revalidatePath("/matches/mutual");
}

/**
 * Generates a new shareable invite link for the signed-in candidate.
 * Clears out any of their own pending invites that expired without
 * being claimed first, so regenerating never trips the one-live-link
 * unique index. No-ops (returns without inserting) if they already
 * have a pending or active link — the UI shouldn't be showing this
 * action then, but this keeps it safe either way.
 */
export async function createFamilyInvite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nowIso = new Date().toISOString();

  await supabase
    .from("account_links")
    .update({ status: "revoked", revoked_at: nowIso })
    .eq("owner_id", user.id)
    .eq("status", "pending")
    .lt("invite_expires_at", nowIso);

  const { data: existing } = await supabase
    .from("account_links")
    .select("id")
    .eq("owner_id", user.id)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (existing) {
    revalidateFamily();
    return;
  }

  const inviteCode = crypto.randomUUID();
  const inviteExpiresAt = new Date(Date.now() + INVITE_LIFETIME_MS).toISOString();

  await supabase.from("account_links").insert({
    owner_id: user.id,
    invite_code: inviteCode,
    invite_expires_at: inviteExpiresAt,
    status: "pending",
  });

  revalidateFamily();
}

/** Cancels a not-yet-claimed invite (or revokes an active link) — same action either way from the candidate's side. */
export async function revokeFamilyLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("account_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("owner_id", user.id)
    .in("status", ["pending", "active"]);

  // Reset sharing on every match, so a newly (re-)invited collaborator
  // later doesn't inherit whatever was shared with whoever just lost
  // access — the candidate can always re-share explicitly.
  await supabase
    .from("matches")
    .update({ shared_with_family: false })
    .or(`candidate_a.eq.${user.id},candidate_b.eq.${user.id}`)
    .eq("shared_with_family", true);

  revalidateFamily();
}

/**
 * Accepts a family invite the signed-in user has navigated to via its
 * link. Safe to call even if the code turns out invalid/expired/
 * already claimed — claim_family_invite() just returns no rows, and
 * the /family/join page treats that as "this invite isn't valid".
 */
export async function acceptFamilyInvite(code: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/family/join?code=${code}`)}`);

  const name = String(formData.get("name") ?? "").trim();

  await supabase.rpc("claim_family_invite", { p_code: code, p_name: name });

  revalidateFamily();
  redirect("/family");
}

/** Candidate-side toggle for whether a given mutual match is visible to their Family Collaborator. */
export async function setMatchFamilySharing(matchId: string, shared: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("set_match_family_sharing", {
    p_match_id: matchId,
    p_shared: shared,
  });

  revalidatePath("/matches/mutual");
}
