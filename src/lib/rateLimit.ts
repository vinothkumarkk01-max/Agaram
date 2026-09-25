import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

/**
 * Rate limiting for login, signup, and message-send (Sept 2026 —
 * security audit punch list, near-term item: "add rate limiting
 * [Arcjet/Upstash] to login, signup, and message-send"). Backed by
 * Upstash's serverless Redis, the founder's chosen vendor.
 *
 * Same optional-integration shape as every other vendor in this app
 * (Resend, Razorpay auto-renew, VAPID push): gated behind env vars,
 * with an honest "not configured" fallback rather than a crash.
 * IMPORTANT, unlike most of those: the fallback here is FAIL OPEN —
 * with no UPSTASH_REDIS_REST_URL/TOKEN set, every check below returns
 * "not limited" and login/signup/messaging work exactly as they did
 * before this file existed. That's deliberate (an unconfigured
 * limiter should never be why a member can't sign in), but it also
 * means this protection is a no-op until those two env vars are set
 * — see README's "Rate limiting" section for the Upstash setup steps.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// One limiter per (action, identifier-kind) pair, not one generic
// limiter reused everywhere -- login and signup have very different
// legitimate-use shapes than an active message thread, and login is
// checked by BOTH ip and email (see login() in actions/auth.ts) so a
// credential-stuffing run spread across many IPs against one account,
// and a brute-force run from one IP against many accounts, are both
// caught. `analytics: false` -- this app has no Upstash Analytics
// dashboard set up, and turning it on would just be silent extra
// Redis writes with nowhere to look at them.
const limiters = redis
  ? {
      "login-ip": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "60 s"),
        prefix: "ratelimit:login-ip",
        analytics: false,
      }),
      "login-email": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        prefix: "ratelimit:login-email",
        analytics: false,
      }),
      "signup-ip": new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "3600 s"),
        prefix: "ratelimit:signup-ip",
        analytics: false,
      }),
      // A real back-and-forth conversation can easily run faster than
      // once a minute; this is sized to stop scripted flooding of a
      // thread, not to slow down normal messaging.
      message: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "60 s"),
        prefix: "ratelimit:message",
        analytics: false,
      }),
    }
  : null;

export type RateLimitAction = keyof NonNullable<typeof limiters>;

export type RateLimitCheck =
  | { limited: false }
  | { limited: true; retryAfterSeconds: number };

export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string
): Promise<RateLimitCheck> {
  if (!limiters) return { limited: false }; // not configured -- see file comment above
  const { success, reset } = await limiters[action].limit(`${action}:${identifier}`);
  if (success) return { limited: false };
  return {
    limited: true,
    retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
  };
}

/**
 * Best-effort client IP for the current request, from the same
 * x-forwarded-for header Vercel (and most reverse proxies) set --
 * see getSiteOrigin in site-url.ts for the sibling pattern reading
 * x-forwarded-host. Never trust this for anything security-critical
 * beyond rate limiting itself (a header is trivially spoofable
 * end-to-end by anyone NOT going through Vercel's edge, which is
 * exactly why this is one signal among two for login, not the only
 * one -- see login-email above).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
