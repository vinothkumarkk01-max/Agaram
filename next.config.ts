import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Best-effort connect-src entry for Sentry's error-ingestion host,
// derived from whatever DSN is actually configured (its host varies
// by account/region, e.g. o123456.ingest.us.sentry.io) rather than
// guessed at. No DSN configured -> no entry, and the rest of the CSP
// is unaffected.
function sentryConnectSrc(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}

// Content-Security-Policy — shipped as Report-Only by default (see
// README, "Security pass (Phase 8)"). It's built from what this app
// is actually known to load: Supabase's API, Razorpay's checkout
// script/frame/beacons, and Sentry's ingestion endpoint. Razorpay in
// particular uses several subdomains for its checkout flow (card
// entry, 3D-Secure/OTP redirects, QR/UPI) that aren't all exercised
// by a single test transaction, so Report-Only is the safe default:
// nothing breaks, but violations show up in the browser console.
//
// CSP_ENFORCE=true (V1, Phase 17) switches the header from
// "Content-Security-Policy-Report-Only" to the real, blocking
// "Content-Security-Policy" — as an env var rather than a code change,
// so flipping it (after you've actually watched a real signup →
// verification → Elite checkout (both one-time and auto-renew) →
// messaging run with the browser console open and seen zero
// violations) doesn't need a new deploy of anything else, and
// un-flipping it if something unexpected breaks is just as fast.
// Leave it unset until you've done that run-through.
function buildCsp(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "https://*.razorpay.com"],
    // Inline `style={{...}}` is this app's primary styling technique
    // (see the Visual Design System doc) — 'unsafe-inline' here is
    // required, not just convenient.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "https://*.razorpay.com"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.razorpay.com",
    ],
    "frame-src": ["https://*.razorpay.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const sentryOrigin = sentryConnectSrc();
  if (sentryOrigin) {
    directives["connect-src"].push(sentryOrigin);
  }

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

const nextConfig: NextConfig = {
  experimental: {
    // Default is 1 MB, well under actions/photo.ts's 8 MB photo-upload
    // cap — multipart/form-data adds its own overhead on top of the
    // file's raw bytes (boundaries, part headers), so this leaves
    // meaningful headroom above 8 MB rather than matching it exactly.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HTTPS is already enforced by Vercel; this additionally
          // tells browsers to never even attempt plain HTTP for this
          // host again, including on the next visit.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Stops a browser from guessing a response's content type
          // away from what the server actually declared.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No legitimate reason for this app to ever render inside
          // someone else's frame (also set via frame-ancestors above,
          // kept here too for older browsers that predate CSP).
          { key: "X-Frame-Options", value: "DENY" },
          // Don't leak full referrer URLs (which can carry match IDs,
          // report IDs, etc.) to third-party destinations.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // This app never uses the camera, microphone, or
          // geolocation — say so explicitly so an embedded/compromised
          // third-party script can't silently request them either.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key:
              process.env.CSP_ENFORCE === "true"
                ? "Content-Security-Policy"
                : "Content-Security-Policy-Report-Only",
            value: buildCsp(),
          },
        ],
      },
    ];
  },
};

// Wrapping is intentionally last — Sentry's own docs call this out,
// and it needs to see the fully-assembled config above (including the
// headers()) to instrument it correctly. Safe to leave in place with
// no Sentry env vars set at all: without SENTRY_AUTH_TOKEN it just
// skips the source-map-upload step of the build with a warning,
// rather than failing it (see README).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: false,
  telemetry: false,
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
});
