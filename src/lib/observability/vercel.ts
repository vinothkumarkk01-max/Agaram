/**
 * Best-effort peek at Vercel's own runtime logs for /admin/failures.
 * Flagged to the founder up front as the weakest of the four sources
 * (see the AskUserQuestion answer this was built from): Vercel's
 * public REST API only exposes a LIVE tail of a specific
 * deployment's logs (`/v1/projects/{id}/deployments/{id}/runtime-logs`,
 * a streaming NDJSON response with no historical query or "since N
 * minutes ago" parameter) — there is no way to ask it for "every
 * error from the last 24 hours" the way the other three sources
 * allow. So this fetches the CURRENT deployment for the requested
 * target (production/preview), taps its live stream for a few
 * seconds, and shows whatever error/fatal lines happened to arrive in
 * that window — genuinely "what's happening right now," not a
 * history. If nothing shows up here, that almost always means
 * nothing errored during this exact page load, not that everything is
 * fine.
 */

const VERCEL_API = "https://api.vercel.com";
const TAIL_WINDOW_MS = 8000;

export type VercelLogLine = {
  level: string;
  message: string;
  timestampInMs: number;
  requestPath?: string;
};

export type FetchResult<T> = { ok: true; rows: T[] } | { ok: false; error: string };

function teamQuery(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `&teamId=${encodeURIComponent(teamId)}` : "";
}

async function latestDeploymentId(
  projectId: string,
  token: string,
  target: "production" | "preview"
): Promise<string | null> {
  const res = await fetch(
    `${VERCEL_API}/v6/deployments?projectId=${projectId}&target=${target}&limit=1${teamQuery()}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { deployments?: Array<{ uid: string }> };
  return data.deployments?.[0]?.uid ?? null;
}

export async function fetchVercelRuntimeErrors(
  target: "production" | "preview"
): Promise<FetchResult<VercelLogLine>> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return { ok: false, error: "VERCEL_API_TOKEN / VERCEL_PROJECT_ID aren't both set." };
  }

  const deploymentId = await latestDeploymentId(projectId, token, target);
  if (!deploymentId) {
    return { ok: false, error: `Couldn't find a current ${target} deployment.` };
  }

  try {
    const res = await fetch(
      `${VERCEL_API}/v1/projects/${projectId}/deployments/${deploymentId}/runtime-logs?${teamQuery().replace(/^&/, "")}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Vercel API ${res.status}: ${body.slice(0, 300)}` };
    }

    // A bounded tail, not a historical query (see the file comment
    // above): read whatever NDJSON lines arrive within the window,
    // then cancel the stream — cancel(), not abort(), so the chunks
    // already read stay readable instead of the whole request
    // rejecting.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const deadline = Date.now() + TAIL_WINDOW_MS;

    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const chunk = await Promise.race([
        reader.read(),
        new Promise<{ done: true; value: undefined }>((resolve) =>
          setTimeout(() => resolve({ done: true, value: undefined }), remaining)
        ),
      ]);
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
    }
    await reader.cancel().catch(() => {});

    const rows: VercelLogLine[] = [];
    for (const line of buffer.split("\n")) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as VercelLogLine;
        if (parsed.level === "error" || parsed.level === "fatal") rows.push(parsed);
      } catch {
        // An incomplete JSON line (chunk boundary landed mid-object) — skip it.
      }
    }
    return { ok: true, rows };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
