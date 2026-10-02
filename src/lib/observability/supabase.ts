/**
 * Pulls both halves of Supabase's own failure history through the
 * Management API (never the project's own anon/service-role client —
 * this reaches into EITHER Supabase project, Production or Preview,
 * from whichever Vercel environment is actually serving /admin/
 * failures, since the two are separate physical databases with no
 * other way to cross-query them from one running deployment).
 *
 * Two different Management API endpoints, for two different things:
 *  - `database/query` runs ordinary SQL against the project's own
 *    Postgres — that's how we read this app's own app_failure_logs
 *    table (Phase 34, supabase/schema.sql) from a project that isn't
 *    the one currently deployed.
 *  - `analytics/endpoints/logs` queries Supabase's separate log
 *    analytics store (GoTrue's own auth_logs) — this is the ONLY way
 *    to see the failures GoTrue never tells the app about, like the
 *    "gomail: could not send email" SMTP error from Sept 29's
 *    debugging session. Its query dialect is closer to ClickHouse
 *    than plain Postgres; kept deliberately simple (a flat
 *    event_message search, no nested-struct joins) since the exact
 *    shape of edge_logs' request/response metadata isn't something
 *    this file has been verified against a live project.
 *
 * SUPABASE_MANAGEMENT_TOKEN is a personal access token from Supabase
 * Account Settings -> Access Tokens — account-wide, not project-
 * scoped, so keep it out of any NEXT_PUBLIC_ variable and never log
 * it. Without it, both functions return `{ ok: false }` with a plain
 * "not configured" message rather than throwing.
 */

const MANAGEMENT_API = "https://api.supabase.com/v1";

export type FailureLogRow = {
  id: string;
  environment: "production" | "preview";
  source: string;
  message: string;
  detail: unknown;
  created_at: string;
};

export type AuthLogRow = {
  timestamp: string;
  event_message: string;
};

export type FetchResult<T> = { ok: true; rows: T[] } | { ok: false; error: string };

function authHeader(): Record<string, string> | null {
  const token = process.env.SUPABASE_MANAGEMENT_TOKEN;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/** This app's own app_failure_logs table (Razorpay, Resend, etc.) — read from the given project ref via the Management API. */
export async function fetchAppFailureLogs(ref: string): Promise<FetchResult<FailureLogRow>> {
  const headers = authHeader();
  if (!headers) return { ok: false, error: "SUPABASE_MANAGEMENT_TOKEN isn't set." };
  if (!ref) return { ok: false, error: "No project ref configured for this environment." };

  try {
    const res = await fetch(`${MANAGEMENT_API}/projects/${ref}/database/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query:
          "select id, environment, source, message, detail, created_at from public.app_failure_logs order by created_at desc limit 100",
        read_only: true,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Supabase Management API ${res.status}: ${body.slice(0, 300)}` };
    }

    const data: unknown = await res.json();
    const rows = Array.isArray(data)
      ? data
      : Array.isArray((data as { result?: unknown })?.result)
        ? ((data as { result: unknown[] }).result)
        : [];

    return { ok: true, rows: rows as FailureLogRow[] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** GoTrue's own auth_logs — the only place a raw SMTP/email-send error from Supabase Auth itself ever appears. */
export async function fetchAuthLogErrors(ref: string): Promise<FetchResult<AuthLogRow>> {
  const headers = authHeader();
  if (!headers) return { ok: false, error: "SUPABASE_MANAGEMENT_TOKEN isn't set." };
  if (!ref) return { ok: false, error: "No project ref configured for this environment." };

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const sql = `
    select timestamp, event_message
    from auth_logs
    where event_message ilike '%error%'
       or event_message ilike '%could not%'
       or event_message ilike '%failed%'
       or event_message ilike '%invalid%'
       or event_message ilike '%exceeded%'
    order by timestamp desc
    limit 50
  `.trim();

  const params = new URLSearchParams({
    sql,
    iso_timestamp_start: start.toISOString(),
    iso_timestamp_end: end.toISOString(),
  });

  try {
    const res = await fetch(`${MANAGEMENT_API}/projects/${ref}/analytics/endpoints/logs?${params}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Supabase Management API ${res.status}: ${body.slice(0, 300)}` };
    }

    const data = (await res.json()) as { result?: AuthLogRow[]; error?: string };
    if (data.error) return { ok: false, error: data.error };

    return { ok: true, rows: data.result ?? [] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
