import crypto from "crypto";

/**
 * Signs/verifies the one-click "unsubscribe from weekly digest" link
 * (api/digest/unsubscribe) — the whole point of that route is that it
 * works with NO login, straight from an email client, so it can't be
 * gated by a Supabase session the way toggleWeeklyDigest() (actions/
 * account.ts) is. An HMAC over the profile id, keyed by a server-only
 * secret, is the standard way to let an anonymous request prove "this
 * link really was minted by us for this exact profile" without a
 * database round trip just to check a token. Same shape as the
 * Razorpay webhook signature check (api/webhooks/razorpay) — a
 * timing-safe compare, not `===`.
 *
 * DIGEST_UNSUB_SECRET is separate from every other secret in this
 * app (never reuse RAZORPAY_WEBHOOK_SECRET or the Supabase service
 * role key here) — see README/.env.local.example.
 */
export function signUnsubscribeToken(profileId: string): string | null {
  const secret = process.env.DIGEST_UNSUB_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(profileId).digest("hex");
}

export function verifyUnsubscribeToken(
  profileId: string,
  token: string
): boolean {
  const expected = signUnsubscribeToken(profileId);
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type DigestCounts = {
  newCandidates: number;
  interestsReceived: number;
  unreadMessages: number;
};

/**
 * The weekly digest email content (PRD §8's "Friday 4pm, your 3
 * introductions" cadence, approximated with what this app can
 * actually compute today — see api/cron/weekly-digest for the real
 * counting logic; this function only ever formats numbers it's
 * handed). Kept deliberately plain — no images, no fancy layout —
 * since the goal is a readable email in every client, not a
 * marketing send.
 */
export function buildDigestEmail(params: {
  fullName: string;
  counts: DigestCounts;
  profileId: string;
  baseUrl: string;
}): { subject: string; html: string; text: string } {
  const { fullName, counts, profileId, baseUrl } = params;
  const base = baseUrl.replace(/\/$/, "");
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const token = signUnsubscribeToken(profileId);
  const unsubscribeUrl = token
    ? `${base}/api/digest/unsubscribe?profile=${profileId}&token=${token}`
    : `${base}/account`;

  const lines: string[] = [];
  if (counts.newCandidates > 0) {
    lines.push(
      `${counts.newCandidates} new ${counts.newCandidates === 1 ? "profile" : "profiles"} matching your preferences`
    );
  }
  if (counts.interestsReceived > 0) {
    lines.push(
      `${counts.interestsReceived} new ${counts.interestsReceived === 1 ? "interest" : "interests"} sent to you`
    );
  }
  if (counts.unreadMessages > 0) {
    lines.push(
      `${counts.unreadMessages} unread ${counts.unreadMessages === 1 ? "message" : "messages"} from your matches`
    );
  }

  const subject =
    lines.length > 0
      ? `Your weekly Agaramiya update: ${lines[0]}`
      : "Your weekly Agaramiya update";

  const bodyLines =
    lines.length > 0
      ? lines.map((l) => `- ${l}`).join("\n")
      : "Nothing new to report this week — check Browse for fresh profiles any time.";

  const bodyHtml =
    lines.length > 0
      ? `<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`
      : `<p>Nothing new to report this week — check Browse for fresh profiles any time.</p>`;

  const text = `Hi ${firstName},

Here's what happened on Agaramiya this week:

${bodyLines}

Open Agaramiya: ${base}/dashboard

---
Don't want these weekly emails? Unsubscribe: ${unsubscribeUrl}`;

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto; padding: 24px;">
    <p>Hi ${firstName},</p>
    <p>Here's what happened on Agaramiya this week:</p>
    ${bodyHtml}
    <p>
      <a href="${base}/dashboard" style="display: inline-block; background: #b8272c; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: 600;">
        Open Agaramiya
      </a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">
      Don't want these weekly emails?
      <a href="${unsubscribeUrl}" style="color: #888;">Unsubscribe</a>
    </p>
  </body>
</html>`;

  return { subject, html, text };
}
