// Runs in the browser before hydration (see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md).
// Mirrors sentry.server.config.ts / sentry.edge.config.ts for the
// client-side runtime — same no-DSN-configured no-op behavior.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,

  // Session Replay is opt-in and off by default here — a matrimonial
  // app's screens carry a lot of personal detail (names, photos,
  // messages), and recording sessions is a real privacy decision this
  // build hasn't made. Leave replaysSessionSampleRate /
  // replaysOnErrorSampleRate unset (both default to 0) unless that
  // decision gets made deliberately, with the DPDP Act privacy policy
  // updated to say so.
});

// Surfaces which route a client-side error happened on, without
// needing tracesSampleRate turned on.
export function onRouterTransitionStart(url: string) {
  Sentry.addBreadcrumb({
    category: "navigation",
    message: `Navigated to ${url}`,
    level: "info",
  });
}
