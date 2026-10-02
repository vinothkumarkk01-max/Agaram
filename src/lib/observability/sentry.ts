/**
 * Reads recent Sentry issues for /admin/failures. Separate from
 * SENTRY_AUTH_TOKEN (sentry.server.config.ts's optional source-map
 * upload token, a different scope) — this needs its own token with
 * read access (Settings -> Auth Tokens in Sentry, scopes `project:read`
 * + `event:read`), named SENTRY_API_TOKEN so the two are never
 * confused.
 *
 * Filtering by environment works because sentry.server.config.ts /
 * sentry.edge.config.ts already tag every event with
 * `environment: process.env.VERCEL_ENV` — exactly "production" or
 * "preview", the same two values this dashboard filters on
 * everywhere else.
 */

export type SentryIssue = {
  id: string;
  title: string;
  count: string;
  lastSeen: string;
  permalink?: string;
};

export type FetchResult<T> = { ok: true; rows: T[] } | { ok: false; error: string };

export async function fetchSentryIssues(
  environment: "production" | "preview"
): Promise<FetchResult<SentryIssue>> {
  const token = process.env.SENTRY_API_TOKEN;
  const org = process.env.SENTRY_ORG_SLUG;
  const project = process.env.SENTRY_PROJECT_SLUG;

  if (!token || !org || !project) {
    return { ok: false, error: "SENTRY_API_TOKEN / SENTRY_ORG_SLUG / SENTRY_PROJECT_SLUG aren't all set." };
  }

  const query = new URLSearchParams({
    query: `is:unresolved environment:${environment}`,
    statsPeriod: "14d",
    limit: "25",
    sort: "date",
  });

  try {
    const res = await fetch(`https://sentry.io/api/0/projects/${org}/${project}/issues/?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Sentry API ${res.status}: ${body.slice(0, 300)}` };
    }

    const data = (await res.json()) as Array<{
      id: string;
      title: string;
      count: string;
      lastSeen: string;
      permalink?: string;
    }>;

    return {
      ok: true,
      rows: data.map((issue) => ({
        id: issue.id,
        title: issue.title,
        count: issue.count,
        lastSeen: issue.lastSeen,
        permalink: issue.permalink,
      })),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
