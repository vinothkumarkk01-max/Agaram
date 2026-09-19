import { createClient } from "@/lib/supabase/server";
import { setEmploymentVerificationStatus } from "@/app/actions/admin";

type Verification = {
  profile_id: string;
  status: "pending" | "verified" | "unable_to_verify";
  method: "work_email" | "employer_attestation";
  employer_name: string | null;
  employer_contact_email: string | null;
  work_email: string | null;
  submitted_at: string;
  verified_at: string | null;
};

export default async function AdminEmploymentPage() {
  const supabase = await createClient();

  const { data: verifications, error } = await supabase
    .from("employment_verifications")
    .select(
      "profile_id, status, method, employer_name, employer_contact_email, work_email, submitted_at, verified_at"
    )
    .order("status", { ascending: true })
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
        No employment/education verification attempts yet.
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
    unable_to_verify: "var(--accent-strong)",
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs" style={{ color: "var(--text-soft)" }}>
        Work-email codes resolve automatically once the member enters
        the right code — you should only ever see &ldquo;pending&rdquo;
        rows here for the employer-attestation method, which has no
        vendor wired in yet and always needs a human decision (see
        README, &ldquo;Employment & education verification&rdquo;).
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
              {v.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
            {v.method === "work_email" ? (
              <>work email · {v.work_email}</>
            ) : (
              <>
                employer attestation · {v.employer_name} ({v.employer_contact_email})
              </>
            )}
            {" · submitted "}
            {new Date(v.submitted_at).toLocaleString()}
            {v.verified_at && ` · resolved ${new Date(v.verified_at).toLocaleString()}`}
          </div>
          {v.status === "pending" && v.method === "employer_attestation" && (
            <div className="flex gap-2">
              <form action={setEmploymentVerificationStatus.bind(null, v.profile_id, "verified", undefined)}>
                <button
                  type="submit"
                  className="rounded-xl py-2 px-4 font-bold text-white text-sm"
                  style={{ background: "var(--ok)" }}
                >
                  Mark verified
                </button>
              </form>
              <form
                action={setEmploymentVerificationStatus.bind(
                  null,
                  v.profile_id,
                  "unable_to_verify",
                  undefined
                )}
              >
                <button
                  type="submit"
                  className="rounded-xl py-2 px-4 font-semibold text-sm"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
                >
                  Unable to verify
                </button>
              </form>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
