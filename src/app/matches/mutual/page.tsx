import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type MutualMatch = {
  match_id: string;
  candidate_id: string;
  full_name: string | null;
  age: number;
  location: string | null;
  about_me: string | null;
  is_verified: boolean;
  matched_at: string;
  is_unlocked: boolean;
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
      {mutuals.map((m) =>
        m.is_unlocked ? (
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
              <p className="text-sm italic mb-3" style={{ color: "var(--text)" }}>
                &ldquo;{m.about_me}&rdquo;
              </p>
            )}
            <Link
              href={`/matches/mutual/${m.match_id}`}
              className="inline-block rounded-xl py-2 px-4 font-bold text-white text-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              Message
            </Link>
          </div>
        ) : (
          <div
            key={m.match_id}
            className="rounded-2xl p-5"
            style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
          >
            <div
              className="text-lg font-semibold mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              It&rsquo;s a match! 🎉
            </div>
            <div className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
              {m.age} years{m.location ? ` · ${m.location}` : ""}
              {m.is_verified ? " · ✓ Identity verified" : ""}
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              Upgrade to Elite to see their name and message them.
            </p>
            <Link
              href="/upgrade"
              className="inline-block rounded-xl py-2.5 px-5 font-bold text-white text-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              Upgrade to Elite
            </Link>
          </div>
        )
      )}
    </div>
  );
}
