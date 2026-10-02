import Link from "next/link";
import {
  fetchAppFailureLogs,
  fetchAuthLogErrors,
} from "@/lib/observability/supabase";
import { fetchSentryIssues } from "@/lib/observability/sentry";
import { fetchVercelRuntimeErrors } from "@/lib/observability/vercel";

type Environment = "production" | "preview";

type UnifiedRow = {
  id: string;
  environment: Environment;
  source: string;
  message: string;
  time: string;
  link?: string;
};

const SOURCE_LABEL: Record<string, string> = {
  razorpay_webhook: "Razorpay webhook",
  razorpay_order: "Razorpay — one-time",
  razorpay_subscription: "Razorpay — subscription",
  email_resend: "Email (Resend)",
  supabase_auth: "Supabase Auth",
  sentry: "Sentry",
  vercel_runtime: "Vercel (live tail)",
};

function projectRef(env: Environment): string {
  return env === "production"
    ? process.env.SUPABASE_PRODUCTION_REF ?? ""
    : process.env.SUPABASE_PREVIEW_REF ?? "";
}

/**
 * Pulls all four failure sources for one environment at once. Every
 * fetcher below already swallows its own errors into `{ ok: false }`
 * — nothing here can throw, so one missing API token never takes the
 * whole page down, just that one source's rows for that environment.
 */
async function fetchEnvironment(
  env: Environment
): Promise<{ rows: UnifiedRow[]; notices: string[] }> {
  const ref = projectRef(env);
  const rows: UnifiedRow[] = [];
  const notices: string[] = [];

  const [appFailures, authErrors, sentryIssues, vercelErrors] = await Promise.all([
    fetchAppFailureLogs(ref),
    fetchAuthLogErrors(ref),
    fetchSentryIssues(env),
    fetchVercelRuntimeErrors(env),
  ]);

  if (appFailures.ok) {
    for (const r of appFailures.rows) {
      rows.push({
        id: `app-${r.id}`,
        environment: env,
        source: r.source,
        message: r.message,
        time: r.created_at,
      });
    }
  } else {
    notices.push(`[${env}] App failure log: ${appFailures.error}`);
  }

  if (authErrors.ok) {
    authErrors.rows.forEach((r, i) => {
      rows.push({
        id: `auth-${env}-${i}`,
        environment: env,
        source: "supabase_auth",
        message: r.event_message,
        time: r.timestamp,
      });
    });
  } else {
    notices.push(`[${env}] Supabase Auth logs: ${authErrors.error}`);
  }

  if (sentryIssues.ok) {
    for (const issue of sentryIssues.rows) {
      rows.push({
        id: `sentry-${issue.id}`,
        environment: env,
        source: "sentry",
        message: `${issue.title} (${issue.count}×)`,
        time: issue.lastSeen,
        link: issue.permalink,
      });
    }
  } else {
    notices.push(`[${env}] Sentry: ${sentryIssues.error}`);
  }

  if (vercelErrors.ok) {
    vercelErrors.rows.forEach((r, i) => {
      rows.push({
        id: `vercel-${env}-${i}`,
        environment: env,
        source: "vercel_runtime",
        message: r.requestPath ? `${r.message} — ${r.requestPath}` : r.message,
        time: new Date(r.timestampInMs).toISOString(),
      });
    });
  } else {
    notices.push(`[${env}] Vercel runtime logs: ${vercelErrors.error}`);
  }

  return { rows, notices };
}

export default async function AdminFailuresPage({
  searchParams,
}: PageProps<"/admin/failures">) {
  const params = await searchParams;
  const raw = typeof params.env === "string" ? params.env : "production";
  const envFilter: "production" | "preview" | "both" =
    raw === "preview" ? "preview" : raw === "both" ? "both" : "production";

  const environments: Environment[] =
    envFilter === "both" ? ["production", "preview"] : [envFilter];

  const results = await Promise.all(environments.map(fetchEnvironment));
  const rows = results
    .flatMap((r) => r.rows)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const notices = results.flatMap((r) => r.notices);

  const tabs: Array<{ value: "production" | "preview" | "both"; label: string }> = [
    { value: "production", label: "Production" },
    { value: "preview", label: "Preview" },
    { value: "both", label: "Both" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: "var(--text-soft)" }}>
        Every failure the app already knows how to detect (Razorpay, Resend), plus a live
        pull from Supabase Auth&rsquo;s own logs, Sentry and Vercel &mdash; one list instead of
        four dashboards. Vercel only ever shows a few seconds of live tail (see the note in
        src/lib/observability/vercel.ts), so its absence here doesn&rsquo;t mean nothing broke.
      </p>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/failures?env=${tab.value}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: envFilter === tab.value ? "var(--accent-strong)" : "var(--bg-sunken)",
              color: envFilter === tab.value ? "#fff" : "var(--text-soft)",
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {notices.length > 0 && (
        <div
          className="rounded-xl p-3.5 text-xs flex flex-col gap-1"
          style={{ background: "var(--bg-sunken)", color: "var(--text-soft)", border: "1px solid var(--line)" }}
        >
          <div className="font-semibold" style={{ color: "var(--text)" }}>
            Some sources aren&rsquo;t reachable right now
          </div>
          {notices.map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center text-sm"
          style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
        >
          No failures found across the sources above.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-xl p-3.5 text-sm"
              style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                  style={{
                    background: r.environment === "production" ? "var(--accent-soft, rgba(142,35,70,0.12))" : "rgba(47,111,111,0.12)",
                    color: r.environment === "production" ? "var(--accent-strong)" : "#2f6f6f",
                  }}
                >
                  {r.environment}
                </span>
                <span className="text-xs font-semibold" style={{ color: "var(--text-soft)" }}>
                  {SOURCE_LABEL[r.source] ?? r.source}
                </span>
              </div>
              <div>{r.message}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>
                {new Date(r.time).toLocaleString()}
                {r.link && (
                  <>
                    {" · "}
                    <a href={r.link} target="_blank" rel="noreferrer" style={{ color: "var(--accent-strong)" }}>
                      Open in Sentry
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
