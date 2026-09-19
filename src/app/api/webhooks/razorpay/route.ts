import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Same six-month period the one-time Elite order uses
// (src/app/actions/payments.ts) — kept as a plain constant here too
// rather than shared, since a webhook handler is deliberately the
// kind of file that changes as little as possible once it's working.
const ELITE_PERIOD_DAYS = 182;

type RazorpayWebhookPayload = {
  event: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity: {
        id: string;
        order_id?: string | null;
        amount: number;
        currency: string;
        subscription_id?: string | null;
      };
    };
  };
};

/**
 * Receives server-to-server events from Razorpay for the auto-renewing
 * Elite subscription (Phase 14, supabase/schema.sql) — configured
 * once in the Razorpay dashboard under Settings -> Webhooks, pointed
 * at this route's URL, with "subscription.charged",
 * "subscription.cancelled", and "subscription.halted" checked (see
 * README for the exact one-time setup steps).
 *
 * There is no member session on a call like this — Razorpay is
 * calling directly — so everything here runs through the service-role
 * client (src/lib/supabase/admin.ts), the same one deleteAccount()
 * uses, and authenticity rests entirely on the HMAC-SHA256 signature
 * check below rather than any RLS policy. Never trust this payload
 * before that check passes.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Not configured yet — 200 so Razorpay doesn't spend its retry
    // budget on a install that hasn't set this up, but do nothing.
    return Response.json(
      { received: false, reason: "webhook not configured" },
      { status: 200 }
    );
  }

  // The raw, untouched bytes are what Razorpay signed — parsing to
  // JSON and re-serializing could reorder keys or change whitespace
  // and silently break verification, so this reads text first and
  // only calls JSON.parse after the signature already checked out.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const signatureValid =
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

  if (!signatureValid) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: RazorpayWebhookPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const subscriptionId = body.payload.subscription?.entity.id;
  const profileId = body.payload.subscription?.entity.notes?.profile_id;

  switch (body.event) {
    case "subscription.charged": {
      const payment = body.payload.payment?.entity;
      if (!subscriptionId || !profileId || !payment) break;

      // Idempotency: Razorpay retries a webhook delivery whenever it
      // doesn't get a 2xx back, so the same charge can arrive more
      // than once. The partial unique index on
      // payments.razorpay_payment_id (Phase 14) makes a second insert
      // for the same payment id fail — caught below and treated as
      // "already recorded," so the expiry-extend logic further down
      // never runs twice for one charge.
      const { error: insertError } = await admin.from("payments").insert({
        profile_id: profileId,
        razorpay_payment_id: payment.id,
        razorpay_subscription_id: subscriptionId,
        razorpay_order_id: payment.order_id ?? null,
        amount: payment.amount,
        currency: payment.currency,
        status: "paid",
        verified_at: new Date().toISOString(),
      });

      if (insertError) {
        // Unique-violation on razorpay_payment_id (23505) means this
        // exact charge was already processed by an earlier delivery
        // of the same event — a normal, expected retry, not a
        // failure. Any other error is a real problem and should make
        // Razorpay retry, so it's re-thrown into the catch-all below.
        if (insertError.code === "23505") {
          return Response.json({ received: true, duplicate: true });
        }
        throw new Error(insertError.message);
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("subscription_expires_at")
        .eq("id", profileId)
        .maybeSingle();

      const now = new Date();
      const currentExpiry = profile?.subscription_expires_at
        ? new Date(profile.subscription_expires_at)
        : null;
      const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(base);
      newExpiry.setDate(newExpiry.getDate() + ELITE_PERIOD_DAYS);

      await admin
        .from("profiles")
        .update({
          subscription_tier: "elite",
          subscription_expires_at: newExpiry.toISOString(),
          subscription_status: "active",
          updated_at: now.toISOString(),
        })
        .eq("id", profileId);
      break;
    }

    case "subscription.cancelled":
    case "subscription.completed": {
      if (!profileId) break;
      await admin
        .from("profiles")
        .update({ subscription_status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", profileId);
      break;
    }

    case "subscription.halted": {
      if (!profileId) break;
      await admin
        .from("profiles")
        .update({ subscription_status: "halted", updated_at: new Date().toISOString() })
        .eq("id", profileId);
      break;
    }

    default:
      // Everything else (subscription.authenticated,
      // subscription.activated, payment.failed, ...) is either
      // informational or already reflected by the events above —
      // acknowledged but ignored.
      break;
  }

  return Response.json({ received: true });
}
