import { createClient } from "@/lib/supabase/server";
import { setVerificationStatus } from "@/app/actions/admin";

type Verification = {
  profile_id: string;
  status: "pending" | "verified" | "failed";
  method: string;
  provider: string;
  submitted_at: string;
  verified_at: string | null;
};

export default async function AdminVerificationsPage() {
  const supabase = await createClient();

  const { data: verifications, error } = await supabase
    .from("identity_verifications")
    .select("profile_id, status, method, provider, submitted_at, verified_at")
    .order("status", { ascending: true }) // 'failed' < 'pending' < 'verified'
    .order("submitted_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const rows = (verifications ?? []) as Verification[];

  if (!rows.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        No verification attempts yet.
      </div>
    );
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      rows.map((r) => r.profile_id)
    );

  const nameOf = (id: string) =>
    profiles?.find((p) => p.id === id)?.full_name ?? "(deleted member)";

  const statusColor: Record<Verification["status"], string> = {
    verified: "var(--ok)",
    pending: "var(--accent-strong)",
    failed: "var(--accent-strong)",
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs" style={{ color: "var(--text-soft)" }}>
        The mock vendor (see README) auto-resolves to verified within a
        few seconds, so you shouldn&rsquo;t see stuck &ldquo;pending&rdquo;
        rows in normal testing — this manual override exists for the
        real vendor integration, when a case genuinely needs a human
        decision.
      </p>
      {rows.map((v) => (
        <div
          key={v.profile_id}
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
        >
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="text-sm font-semibold">{nameOf(v.profile_id)}</div>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: statusColor[v.status] }}
            >
              {v.status}
            </span>
          </div>
          <div className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
            {v.method} via {v.provider} · submitted{" "}
            {new Date(v.submitted_at).toLocaleString()}
            {v.verified_at &&
              ` · resolved ${new Date(v.verified_at).toLocaleString()}`}
          </div>
          {v.status === "pending" && (
            <div className="flex gap-2">
              <form action={setVerificationStatus.bind(null, v.profile_id, "verified")}>
                <button
                  type="submit"
                  className="rounded-xl py-2 px-4 font-bold text-white text-sm"
                  style={{ background: "var(--ok)" }}
                >
                  Mark verified
                </button>
              </form>
              <form action={setVerificationStatus.bind(null, v.profile_id, "failed")}>
                <button
                  type="submit"
                  className="rounded-xl py-2 px-4 font-semibold text-sm"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
                >
                  Mark failed
                </button>
              </form>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
