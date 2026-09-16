import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { reportMember } from "@/app/actions/reports";

export default async function ReportMatchPage({
  params,
}: PageProps<"/matches/mutual/[matchId]/report">) {
  const { matchId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // the /matches layout already redirects signed-out users

  const { data: match } = await supabase
    .from("matches")
    .select("id, candidate_a, candidate_b, status")
    .eq("id", matchId)
    .maybeSingle();

  const isParticipant =
    match && (match.candidate_a === user.id || match.candidate_b === user.id);

  if (!match || !isParticipant || match.status !== "mutual") {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        This conversation isn&rsquo;t available.{" "}
        <Link href="/matches/mutual" className="underline font-semibold">
          Back to Mutual
        </Link>
      </div>
    );
  }

  const { data: existingReport } = await supabase
    .from("reports")
    .select("id, status, created_at")
    .eq("match_id", matchId)
    .eq("reporter_id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/matches/mutual/${matchId}`}
        className="text-xs font-semibold inline-block"
        style={{ color: "var(--text-soft)" }}
      >
        &larr; Back to conversation
      </Link>

      {existingReport ? (
        <div
          className="rounded-2xl p-6 text-sm"
          style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
        >
          You&rsquo;ve already reported this conversation, on{" "}
          {new Date(existingReport.created_at).toLocaleDateString()}. Our
          team will review it.
        </div>
      ) : (
        <form action={reportMember.bind(null, matchId)} className="flex flex-col gap-3">
          <h1 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
            Report this conversation
          </h1>
          <p className="text-sm" style={{ color: "var(--text-soft)" }}>
            Tell us what happened. This goes straight to the team running
            Agaram, not to the other member.
          </p>
          <textarea
            name="reason"
            required
            maxLength={2000}
            rows={5}
            placeholder="What happened?"
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
          />
          <button
            type="submit"
            className="self-start rounded-xl py-2.5 px-5 font-bold text-white text-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            Submit report
          </button>
        </form>
      )}
    </div>
  );
}
