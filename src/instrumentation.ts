// Runs once when a new server instance starts (see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md).
// register() loads the runtime-appropriate Sentry config; onRequestError
// forwards every server-side error Next.js captures (Server Components,
// Route Handlers, Server Actions, the proxy) to Sentry, with no other
// code in the app needing to know Sentry exists.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
