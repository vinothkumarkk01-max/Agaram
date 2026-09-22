import { createClient } from "@/lib/supabase/server";
import { setConciergeStatus } from "@/app/actions/admin";

type Application = {
  id: string;
  profile_id: string;
  contact_phone: string;
  notes: string | null;
  status: "submitted" | "contacted" | "in_progress" | "closed";
  submitted_at: string;
};

const nextStatus: Record<Application["status"], Application["status"] | null> = {
  submitted: "contacted",
  contacted: "in_progress",
  in_progress: "closed",
  closed: null,
};

const nextLabel: Record<Application["status"], string> = {
  submitted: "Mark contacted",
  contacted: "Mark in progress",
  in_progress: "Mark closed",
  closed: "",
};

export default async function AdminConciergePage() {
  const supabase = await createClient();

  const { data: applications, error } = await supabase
    .from("concierge_applications")
    .select("id, profile_id, contact_phone, notes, status, submitted_at")
    .order("status", { ascending: true })
    .order("submitted_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const rows = (applications ?? []) as Application[];

  if (!rows.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        No Agaramiya Concierge applications yet.
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

  const statusColor: Record<Application["status"], string> = {
    submitted: "var(--accent-strong)",
    contacted: "var(--accent-strong)",
    in_progress: "var(--accent-strong)",
    closed: "var(--ok)",
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs" style={{ color: "var(--text-soft)" }}>
        Agaramiya Concierge is a manual, founder-run service (PRD §11) — no
        automated matching or billing sits behind it. This is just your
        own record of where each conversation has gotten to; call the
        phone number below to move it forward.
      </p>
      {rows.map((a) => (
        <div
          key={a.id}
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
        >
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="text-sm font-semibold">{nameOf(a.profile_id)}</div>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: statusColor[a.status] }}
            >
              {a.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="text-xs mb-2" style={{ color: "var(--text-soft)" }}>
            {a.contact_phone}
            {" · submitted "}
            {new Date(a.submitted_at).toLocaleString()}
          </div>
          {a.notes && (
            <p className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
              {a.notes}
            </p>
          )}
          {nextStatus[a.status] && (
            <form
              action={setConciergeStatus.bind(
                null,
                a.id,
                nextStatus[a.status] as "contacted" | "in_progress" | "closed"
              )}
            >
              <button
                type="submit"
                className="rounded-xl py-2 px-4 font-bold text-white text-sm"
                style={{ background: "var(--accent-strong)" }}
              >
                {nextLabel[a.status]}
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
