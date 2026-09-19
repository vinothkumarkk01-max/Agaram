import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  milestone: string | null;
};

/**
 * Read-only — reachable only via viewReportMessages()
 * (src/app/actions/admin.ts), which logs an admin_actions row before
 * redirecting here. Rendering this page never itself writes to the
 * audit log; the record is made at the point the admin chose to open
 * it, not on every subsequent render of the same URL (a reload, a
 * back-forward navigation, ...).
 *
 * The select below relies on "Admins can view all messages" (Phase
 * 16, supabase/schema.sql) — an additional, admin-only RLS policy on
 * top of the normal participant-only one; nothing here uses a
 * service-role key.
 */
export default async function AdminReportMessagesPage({
  params,
}: PageProps<"/admin/reports/[id]/messages">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("reports")
    .select("id, match_id, reporter_id, reported_id, reason")
    .eq("id", id)
    .maybeSingle();

  if (!report) redirect("/admin/reports");

  const { data: messagesData } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, milestone")
    .eq("match_id", report.match_id)
    .order("created_at", { ascending: true });
  const messages = (messagesData ?? []) as Message[];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", [report.reporter_id, report.reported_id]);

  const nameOf = (profileId: string) =>
    profiles?.find((p) => p.id === profileId)?.full_name ?? "(deleted member)";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/reports"
        className="text-xs font-semibold inline-flex items-center gap-1.5"
        style={{ color: "var(--accent-strong)" }}
      >
        ← Back to reports
      </Link>

      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
      >
        <div className="text-sm font-semibold mb-1">
          {nameOf(report.reporter_id)} reported {nameOf(report.reported_id)}
        </div>
        <p className="text-sm" style={{ color: "var(--text-soft)" }}>
          {report.reason}
        </p>
      </div>

      <div
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-soft)" }}
      >
        Conversation ({messages.length} message{messages.length === 1 ? "" : "s"})
      </div>

      {messages.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center text-sm"
          style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
        >
          No messages in this conversation.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className="rounded-xl p-3.5 text-sm"
              style={{ background: "var(--bg-sunken)" }}
            >
              <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-soft)" }}>
                {nameOf(m.sender_id)} · {new Date(m.created_at).toLocaleString()}
              </div>
              {m.milestone ? (
                <span style={{ color: "var(--ok)" }}>Marked stage: {m.milestone}</span>
              ) : (
                m.body
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
