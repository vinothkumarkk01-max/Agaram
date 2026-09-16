// Sentry init for the Edge runtime (proxy.ts / middleware). Imported
// from src/instrumentation.ts's register() — never import this file
// directly anywhere else. See sentry.server.config.ts for the
// no-DSN-configured / no-source-maps notes; the same applies here.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
