import { createClient } from "@/lib/supabase/server";
import { CandidateCard, type MaskedCandidate } from "@/components/CandidateCard";
import { getDictionary } from "@/lib/i18n/server";

export default async function BrowseMatchesPage() {
  const supabase = await createClient();
  const { data: candidates, error } = await supabase.rpc(
    "get_match_candidates"
  );
  const { t } = await getDictionary();

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const list = (candidates ?? []) as MaskedCandidate[];

  if (!list.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        {t.matches.noCandidates}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {list.map((candidate) => (
        <CandidateCard key={candidate.id} candidate={candidate} t={t} />
      ))}
    </div>
  );
}
