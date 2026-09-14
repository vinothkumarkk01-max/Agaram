import { createClient } from "@/lib/supabase/server";
import { respondToInterest } from "@/app/actions/matches";

type ReceivedInterest = {
  match_id: string;
  candidate_id: string;
  age: number;
  location: string | null;
  initial: string;
  is_verified: boolean;
  created_at: string;
};

export default async function ReceivedInterestsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_received_interests");

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const received = (data ?? []) as ReceivedInterest[];

  if (!received.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        No one&rsquo;s expressed interest yet — they&rsquo;ll show up here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {received.map((m) => (
        <div
          key={m.match_id}
          className="rounded-2xl p-5 flex items-center justify-between gap-4"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
              style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
            >
              {m.initial}.
            </div>
            <div>
              <div className="text-sm font-semibold">
                {m.age} years{m.location ? ` · ${m.location}` : ""}
              </div>
              {m.is_verified && (
                <div
                  className="text-xs font-semibold mt-1"
                  style={{ color: "var(--ok)" }}
                >
                  ✓ Identity verified
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <form action={respondToInterest.bind(null, m.match_id, false)}>
              <button
                type="submit"
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--line)",
                  color: "var(--text-soft)",
                }}
              >
                Decline
              </button>
            </form>
            <form action={respondToInterest.bind(null, m.match_id, true)}>
              <button
                type="submit"
                className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                }}
              >
                Accept
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
