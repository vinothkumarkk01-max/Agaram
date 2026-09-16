// Sentry init for the Node.js server runtime (Server Components, Route
// Handlers, Server Actions). Imported from src/instrumentation.ts's
// register() — never import this file directly anywhere else.
//
// If NEXT_PUBLIC_SENTRY_DSN isn't set, Sentry.init() with dsn:
// undefined is a documented no-op: the SDK initializes but never
// sends anything, so local dev without a Sentry account still runs
// fine (see README, "Error tracking (Phase 8)").
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Errors only for now, no perf/tracing sampling — this is a solo
  // V0 project with no real traffic yet; turn this up once there's
  // something worth sampling.
  tracesSampleRate: 0,

  // Sends readable stack traces without needing source maps uploaded
  // (SENTRY_AUTH_TOKEN is optional — see README). Safe default for a
  // project that isn't uploading source maps yet.
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
