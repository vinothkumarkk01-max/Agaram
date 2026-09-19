"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type JathagamActionState = { error?: string; success?: string } | undefined;

/**
 * Saves birth details only — see supabase/schema.sql Phase 26 for why
 * there is deliberately no compatibility score anywhere in this file
 * or the schema. `visibility` is carried on THIS same form (rather
 * than a separate toggle action) so a member can fill in details and
 * choose to keep them private in one step, matching how little
 * ceremony the rest of this form has.
 */
export async function saveJathagamDetails(
  _prevState: JathagamActionState,
  formData: FormData
): Promise<JathagamActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const birthDate = String(formData.get("birth_date") ?? "").trim();
  const birthTime = String(formData.get("birth_time") ?? "").trim();
  const birthPlace = String(formData.get("birth_place") ?? "").trim();
  const birthStar = String(formData.get("birth_star") ?? "").trim();
  const rasi = String(formData.get("rasi") ?? "").trim();
  const visibility = formData.get("visibility") === "mutual_match" ? "mutual_match" : "private";

  const { error } = await supabase.from("jathagam_details").upsert({
    profile_id: user.id,
    birth_date: birthDate || null,
    birth_time: birthTime || null,
    birth_place: birthPlace || null,
    birth_star: birthStar || null,
    rasi: rasi || null,
    visibility,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/matches/mutual");
  return { success: "Saved." };
}
