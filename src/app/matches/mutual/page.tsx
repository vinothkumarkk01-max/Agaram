import { createClient } from "@/lib/supabase/server";

type MutualMatch = {
  match_id: string;
  candidate_id: string;
  full_name: string;
  age: number;
  location: string | null;
  about_me: string | null;
  is_verified: boolean;
  matched_at: string;
};

export default async function MutualMatchesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_mutual_matches");

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const mutuals = (data ?? []) as MutualMatch[];

  if (!mutuals.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        No mutual matches yet — once you and someone else are both
        interested, they&rsquo;ll unlock here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {mutuals.map((m) => (
        <div
          key={m.match_id}
          className="rounded-2xl p-5"
          style={{ background: "var(--ok-soft)", border: "1px solid var(--line)" }}
        >
          <div
            className="text-lg font-semibold mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {m.full_name}
          </div>
          <div className="text-xs mb-2" style={{ color: "var(--text-soft)" }}>
            {m.age} years{m.location ? ` · ${m.location}` : ""}
            {m.is_verified ? " · ✓ Identity verified" : ""}
          </div>
          {m.about_me && (
            <p className="text-sm italic" style={{ color: "var(--text)" }}>
              &ldquo;{m.about_me}&rdquo;
            </p>
          )}
          <p className="text-xs mt-3" style={{ color: "var(--ok)" }}>
            🎉 It&rsquo;s a match! In-app messaging comes in the next phase.
          </p>
        </div>
      ))}
    </div>
  );
}
