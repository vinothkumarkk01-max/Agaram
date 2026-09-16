import { createClient } from "@/lib/supabase/server";
import { resolveReport } from "@/app/actions/admin";

type Report = {
  id: string;
  match_id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  status: "open" | "resolved";
  created_at: string;
  resolved_at: string | null;
};

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const { data: reports, error } = await supabase
    .from("reports")
    .select(
      "id, match_id, reporter_id, reported_id, reason, status, created_at, resolved_at"
    )
    .order("status", { ascending: true }) // 'open' sorts before 'resolved'
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const rows = (reports ?? []) as Report[];

  if (!rows.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        No reports yet.
      </div>
    );
  }

  // Manual join — reports.reporter_id and .reported_id both point at
  // profiles, and PostgREST's embed shorthand needs a same-table
  // disambiguation this app doesn't otherwise rely on, so a plain
  // second query is simpler and easier to read.
  const profileIds = Array.from(
    new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id]))
  );
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  const nameOf = (id: string) =>
    profiles?.find((p) => p.id === id)?.full_name ?? "(deleted member)";

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl p-5"
          style={{
            background: r.status === "open" ? "var(--accent-soft)" : "var(--bg-sunken)",
            border: "1px solid var(--line)",
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-sm font-semibold">
              {nameOf(r.reported_id)}{" "}
              <span className="font-normal" style={{ color: "var(--text-soft)" }}>
                reported by {nameOf(r.reporter_id)}
              </span>
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{
                color: r.status === "open" ? "var(--accent-strong)" : "var(--ok)",
              }}
            >
              {r.status}
            </span>
          </div>
          <p className="text-sm mb-3" style={{ color: "var(--text)" }}>
            {r.reason}
          </p>
          <div className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
            Filed {new Date(r.created_at).toLocaleString()}
            {r.resolved_at &&
              ` · Resolved ${new Date(r.resolved_at).toLocaleString()}`}
          </div>
          {r.status === "open" && (
            <form action={resolveReport.bind(null, r.id)}>
              <button
                type="submit"
                className="rounded-xl py-2 px-4 font-bold text-white text-sm"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                }}
              >
                Mark resolved
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
