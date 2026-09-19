import { createClient } from "@/lib/supabase/server";

type AdminActionRow = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  detail: string | null;
  created_at: string;
};

/**
 * Everything admin.ts's server actions write to admin_actions (Phase
 * 16, supabase/schema.sql) — most recent first, capped at 200 rows.
 * No filtering/search UI yet; with one founder acting as the only
 * admin so far, a plain reverse-chronological list is enough to
 * answer "what did I do and when."
 */
export default async function AdminAuditPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_actions")
    .select("id, admin_id, action, target_type, target_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
        {error.message}
      </p>
    );
  }

  const rows = (data ?? []) as AdminActionRow[];

  if (!rows.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center text-sm"
        style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
      >
        No admin actions logged yet.
      </div>
    );
  }

  const adminIds = Array.from(new Set(rows.map((r) => r.admin_id)));
  const { data: admins } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", adminIds);

  const nameOf = (id: string) =>
    admins?.find((a) => a.id === id)?.full_name ?? "(unknown admin)";

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div
          key={r.id}
          className="rounded-xl p-3.5 text-sm"
          style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
        >
          <div className="font-semibold">
            {nameOf(r.admin_id)} — {r.action.replace(/_/g, " ")}
          </div>
          <div className="text-xs" style={{ color: "var(--text-soft)" }}>
            {r.target_type}
            {r.target_id ? ` · ${r.target_id}` : ""} ·{" "}
            {new Date(r.created_at).toLocaleString()}
          </div>
          {r.detail && (
            <div className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>
              {r.detail}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
