import { headers } from "next/headers";

/**
 * Best-effort absolute origin for the current request, used to build
 * shareable links (the family-invite URL) server-side. Reads the
 * incoming Host header rather than a hardcoded env var, so this works
 * unmodified on any deployment — custom domain, a Vercel preview URL,
 * or localhost — with zero configuration.
 */
export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}
