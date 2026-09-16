import { createClient } from "@/lib/supabase/server";

/**
 * Self-serve data export — the /account "Download my data" button.
 * Every query here runs through the caller's own regular (RLS-bound)
 * session, the same as everywhere else in this app; nothing here
 * needs, or uses, the service-role client. Each query only ever
 * returns rows this member's existing RLS policies already let them
 * read, so this route adds no new data access, just packages what's
 * already theirs into one downloadable file.
 *
 * Deliberately excluded: reports filed AGAINST this member. Reports
 * they filed themselves are included (that's clearly their own data);
 * what someone else said about them in a report is a trust & safety
 * record with its own separate handling, the same reasoning the admin
 * dashboard (Phase 7) already applies to message content.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Please sign in first." }, { status: 401 });
  }

  const [
    profile,
    preferences,
    verification,
    payments,
    sentMatches,
    receivedMatches,
    reportsFiled,
    blocked,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("preferences")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("identity_verifications")
      .select("status, method, aadhaar_last4, submitted_at, verified_at")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select(
        "razorpay_order_id, razorpay_payment_id, amount, currency, status, created_at, verified_at"
      )
      .eq("profile_id", user.id),
    supabase.from("matches").select("*").eq("candidate_a", user.id),
    supabase.from("matches").select("*").eq("candidate_b", user.id),
    supabase
      .from("reports")
      .select("match_id, reported_id, reason, status, created_at, resolved_at")
      .eq("reporter_id", user.id),
    supabase.rpc("get_blocked_members"),
  ]);

  const matches = [...(sentMatches.data ?? []), ...(receivedMatches.data ?? [])];
  const matchIds = matches.map((m) => m.id);

  const messages = matchIds.length
    ? await supabase
        .from("messages")
        .select("match_id, sender_id, body, created_at")
        .in("match_id", matchIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const body = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email },
      profile: profile.data ?? null,
      match_preferences: preferences.data ?? null,
      identity_verification: verification.data ?? null,
      payments: payments.data ?? [],
      matches,
      messages: messages.data ?? [],
      reports_you_filed: reportsFiled.data ?? [],
      blocked_members: blocked.data ?? [],
      note:
        "Reports filed against you (rather than by you) are not included in this export — see the project README for why.",
    },
    null,
    2
  );

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="agaram-data-export-${user.id}.json"`,
    },
  });
}
