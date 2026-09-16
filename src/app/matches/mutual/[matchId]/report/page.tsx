import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { reportMember } from "@/app/actions/reports";
import { getDictionary } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/locale";

export default async function ReportMatchPage({
  params,
}: PageProps<"/matches/mutual/[matchId]/report">) {
  const { matchId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // the /matches layout already redirects signed-out users
  const { locale, t } = await getDictionary();

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
        {t.matches.conversationUnavailable}{" "}
        <Link href="/matches/mutual" className="underline font-semibold">
          {t.matches.backToMutual}
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
        {t.matches.backToConversation}
      </Link>

      {existingReport ? (
        <div
          className="rounded-2xl p-6 text-sm"
          style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
        >
          {t.matches.alreadyReportedPrefix}
          {new Date(existingReport.created_at).toLocaleDateString(intlLocale(locale))}
          {t.matches.alreadyReportedSuffix}
        </div>
      ) : (
        <form action={reportMember.bind(null, matchId)} className="flex flex-col gap-3">
          <h1 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
            {t.matches.reportTitle}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-soft)" }}>
            {t.matches.reportSubtitle}
          </p>
          <textarea
            name="reason"
            required
            maxLength={2000}
            rows={5}
            placeholder={t.matches.whatHappened}
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
            {t.matches.submitReport}
          </button>
        </form>
      )}
    </div>
  );
}
