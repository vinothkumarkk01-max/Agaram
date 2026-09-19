/**
 * The one place this app sends transactional/product email, via
 * Resend (see README, "Environment variables"). Two callers today:
 * actions/employment.ts (work-email OTP codes) and the weekly-digest
 * cron route (api/cron/weekly-digest). Both are best-effort in spirit
 * but NOT silently-swallowed the way push notifications are — a push
 * failure is invisible to the recipient either way, but an OTP email
 * that never sends is the one thing standing between a member and
 * finishing that verification step, so callers that need to know
 * whether it actually sent check this function's return value rather
 * than firing-and-forgetting it.
 *
 * RESEND_API_KEY and RESEND_FROM_ADDRESS come from resend.com — see
 * README for the one-time setup (a sending domain has to be verified
 * there before Resend will actually deliver, not just accept, mail).
 * Without them, this returns { sent: false, reason: "not_configured" }
 * rather than throwing, so a caller can show a clear "isn't set up
 * yet" message instead of crashing.
 */
export type SendEmailResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "send_failed"; error?: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_ADDRESS;

  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { sent: false, reason: "send_failed", error: body || response.statusText };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: "send_failed",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
