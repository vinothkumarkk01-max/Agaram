import { signUnsubscribeToken } from "@/lib/email/digest";

/**
 * Instant email alerts — "someone is interested in you" and "you have
 * a new mutual match" — sent the moment those things happen (see the
 * hook points in app/actions/matches.ts), as opposed to the weekly
 * digest's once-a-week roundup (lib/email/digest.ts). Deliberately
 * reuses that file's signUnsubscribeToken()/DIGEST_UNSUB_SECRET rather
 * than minting a second secret — see the Phase 27 schema comment for
 * why that's safe. instant_alerts_opt_out (Phase 27) is the separate
 * preference that gates whether these get sent at all; that check
 * lives in app/actions/matches.ts, alongside the DB lookups these
 * builders don't do themselves — same division of labor as
 * digest.ts's pure builder vs. the cron route's DB work.
 *
 * Same masking rule as everywhere else in this app: a candidate's
 * full_name/about_me are only ever shown to an Elite subscriber, even
 * across a mutual match (supabase/schema.sql's get_mutual_matches()).
 * These emails never include a name — only the same masked fields
 * (age, location, verification badge) every masked candidate card
 * already shows any signed-in member, so an alert email can never leak
 * more than the in-app UI already would.
 */

function unsubscribeUrl(baseUrl: string, profileId: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const token = signUnsubscribeToken(profileId);
  return token
    ? `${base}/api/alerts/unsubscribe?profile=${profileId}&token=${token}`
    : `${base}/account`;
}

function wrapHtml(bodyHtml: string, unsubscribeLink: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto; padding: 24px;">
    ${bodyHtml}
    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">
      Don't want these instant alerts?
      <a href="${unsubscribeLink}" style="color: #888;">Unsubscribe</a>
    </p>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p>
    <a href="${href}" style="display: inline-block; background: #b8272c; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: 600;">
      ${label}
    </a>
  </p>`;
}

/**
 * Sent to the RECIPIENT of a fresh interest (a new row, or a
 * re-surfaced declined pair restarted after its 30-day cooldown — see
 * expressInterest() in app/actions/matches.ts). `sender` is the masked
 * view of whoever expressed interest, mirroring exactly what
 * get_received_interests() already returns for that same row.
 */
export function buildNewInterestEmail(params: {
  fullName: string;
  baseUrl: string;
  profileId: string;
  sender: { age: number; location: string | null; is_verified: boolean };
}): { subject: string; html: string; text: string } {
  const { fullName, baseUrl, profileId, sender } = params;
  const base = baseUrl.replace(/\/$/, "");
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const unsubscribe = unsubscribeUrl(baseUrl, profileId);

  const facts: string[] = [`${sender.age} years old`];
  if (sender.location) facts.push(sender.location);
  if (sender.is_verified) facts.push("identity verified");
  const factLine = facts.join(" · ");

  const subject = "New interest on Agaramiya";

  const text = `Hi ${firstName},

Someone new is interested in you on Agaramiya: ${factLine}.

Review it: ${base}/matches/received

---
Don't want these instant alerts? Unsubscribe: ${unsubscribe}`;

  const html = wrapHtml(
    `<p>Hi ${firstName},</p>
    <p>Someone new is interested in you on Agaramiya:</p>
    <p style="font-weight: 600;">${factLine}</p>
    ${button(`${base}/matches/received`, "Review interest")}`,
    unsubscribe
  );

  return { subject, html, text };
}

/**
 * Sent to BOTH participants the moment a pair becomes mutual (either
 * expressInterest() completing a mutual match, or respondToInterest()
 * accepting one). `other` is the masked view of the other participant
 * — the same fields get_mutual_matches() always returns regardless of
 * Elite status; full_name/about_me stay withheld here exactly as they
 * are in that function until the recipient's own subscription unlocks
 * them in-app.
 */
export function buildNewMatchEmail(params: {
  fullName: string;
  baseUrl: string;
  profileId: string;
  other: { age: number; location: string | null };
}): { subject: string; html: string; text: string } {
  const { fullName, baseUrl, profileId, other } = params;
  const base = baseUrl.replace(/\/$/, "");
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const unsubscribe = unsubscribeUrl(baseUrl, profileId);

  const facts: string[] = [`${other.age} years old`];
  if (other.location) facts.push(other.location);
  const factLine = facts.join(" · ");

  const subject = "It's a mutual match on Agaramiya";

  const text = `Hi ${firstName},

You have a new mutual match on Agaramiya: ${factLine}.

Open the conversation: ${base}/matches/mutual

---
Don't want these instant alerts? Unsubscribe: ${unsubscribe}`;

  const html = wrapHtml(
    `<p>Hi ${firstName},</p>
    <p>You have a new mutual match on Agaramiya:</p>
    <p style="font-weight: 600;">${factLine}</p>
    ${button(`${base}/matches/mutual`, "Open conversation")}`,
    unsubscribe
  );

  return { subject, html, text };
}
