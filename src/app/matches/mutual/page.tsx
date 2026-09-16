import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";

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
  const { t } = await getDictionary();

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
        {t.matches.noMutual}
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
              {m.age} {t.dashboard.years}{m.location ? ` · ${m.location}` : ""}
              {m.is_verified ? ` · ${t.dashboard.identityVerified}` : ""}
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
              {t.matches.message}
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
              {t.matches.itsAMatch}
            </div>
            <div className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
              {m.age} {t.dashboard.years}{m.location ? ` · ${m.location}` : ""}
              {m.is_verified ? ` · ${t.dashboard.identityVerified}` : ""}
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              {t.matches.upgradeToSeeMessage}
            </p>
            <Link
              href="/upgrade"
              className="inline-block rounded-xl py-2.5 px-5 font-bold text-white text-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              {t.matches.upgradeToEliteBtn}
            </Link>
          </div>
        )
      )}
    </div>
  );
}
