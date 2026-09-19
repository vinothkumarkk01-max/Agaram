"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ConciergeActionState = { error?: string; success?: string } | undefined;

/**
 * Royal Concierge tier intake (PRD §11, supabase/schema.sql Phase 21).
 * This is deliberately just a queue, not a purchase — there's no
 * Razorpay checkout wired to this tier (see the schema comment): a
 * founder-run manual service (phone call, negotiated pricing) doesn't
 * belong behind an automated payment flow the way Elite does. This
 * action only ever records an application; /admin/concierge is where
 * you (the founder) track the real conversation with each applicant.
 */
export async function submitConciergeApplication(
  _prevState: ConciergeActionState,
  formData: FormData
): Promise<ConciergeActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!/^[\d+\-\s()]{7,20}$/.test(contactPhone)) {
    return { error: "Enter a valid phone number to reach you on." };
  }

  const { error } = await supabase.from("concierge_applications").insert({
    profile_id: user.id,
    contact_phone: contactPhone,
    notes: notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/concierge/apply");
  revalidatePath("/account");
  return {
    success:
      "Request received — we'll call you within a couple of days to talk through Royal Concierge.",
  };
}
