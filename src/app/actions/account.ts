"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteAccountState = { error?: string } | undefined;

/**
 * Permanently deletes the signed-in member's account. Deleting the
 * underlying `auth.users` row (via the Supabase Admin API — the only
 * way to do that; see lib/supabase/admin.ts) cascades everything else
 * this app stores about them, since every table's foreign key back to
 * profiles.id was already declared `on delete cascade`: profile,
 * preferences, identity verification, payment history, matches (both
 * sides), messages, reports filed, and their blocklist.
 *
 * Two things worth knowing about that cascade, not just for you but
 * worth telling members before they confirm:
 * - Deleting your account also deletes any match/message thread you
 *   were part of — for the OTHER person too, not just you. There's
 *   no way to delete only your half of a shared conversation.
 * - Reports you filed, and reports filed against you, are deleted
 *   too. That's consistent with "right to erasure," but it does mean
 *   self-deletion can erase a pending trust & safety case. Worth
 *   revisiting (e.g. keeping an anonymized record) before this
 *   matters at real scale — not addressed here.
 *
 * Requires typing the account's own email to confirm, on top of the
 * checkbox — this is irreversible and there's no undo screen.
 */
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const confirmedUnderstood = formData.get("confirm_understood") === "on";
  const confirmEmail = String(formData.get("confirm_email") ?? "").trim();

  if (!confirmedUnderstood) {
    return { error: "Please confirm you understand this is permanent." };
  }
  if (confirmEmail.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return { error: "Type your account email exactly to confirm." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Account deletion isn't configured yet.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: error.message };
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // The account (and its session) is already gone server-side —
    // any error here is expected and harmless.
  }

  redirect("/");
}
