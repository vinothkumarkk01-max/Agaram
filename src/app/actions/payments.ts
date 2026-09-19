"use server";

import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";

// ₹15,000 / 6 months, per the PRD's Elite tier (§11). Razorpay wants
// amounts in the smallest currency unit — paise for INR.
const ELITE_PRICE_PAISE = 1_500_000;
const ELITE_PERIOD_DAYS = 182;

export type CreateOrderResult =
  | { error: string }
  | { orderId: string; amount: number; currency: string; keyId: string };

/**
 * Creates a Razorpay order for the Elite plan and records it as
 * "created" in our own `payments` table. The order is only ever
 * marked "paid" — and the subscription only ever activated — after
 * `verifyElitePayment` below checks the signature server-side.
 */
export async function createEliteOrder(): Promise<CreateOrderResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return {
      error:
        "Payments aren't configured yet — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in first." };
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  let order;
  try {
    order = await razorpay.orders.create({
      amount: ELITE_PRICE_PAISE,
      currency: "INR",
      receipt: `elite_${user.id}_${Date.now()}`,
      notes: { profile_id: user.id, plan: "elite" },
    });
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not start checkout — please try again.",
    };
  }

  const { error: dbError } = await supabase.from("payments").insert({
    profile_id: user.id,
    razorpay_order_id: order.id,
    amount: ELITE_PRICE_PAISE,
    currency: "INR",
    status: "created",
  });

  if (dbError) {
    return { error: dbError.message };
  }

  return {
    orderId: order.id,
    amount: ELITE_PRICE_PAISE,
    currency: "INR",
    keyId,
  };
}

export type VerifyPaymentResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Verifies a completed Razorpay checkout server-side (the standard
 * order_id|payment_id HMAC-SHA256 signature check, per Razorpay's
 * documented flow) before touching the subscription. Never trust the
 * client-side "handler" callback alone — this is what actually
 * grants Elite access.
 *
 * The actual writes go through finalize_elite_payment() /
 * mark_payment_failed() (supabase/schema.sql, Phase 8's security
 * pass), not a direct .update() on payments/profiles — those columns
 * are now locked against ordinary member writes (RLS WITH CHECK on
 * payments.status, a column-privilege revoke on
 * profiles.subscription_tier/expires_at), specifically so that
 * "mark paid and grant Elite" can only ever happen from here, after
 * the signature check below has already passed.
 */
export async function verifyElitePayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<VerifyPaymentResult> {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return { success: false, error: "Payments aren't configured yet." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Please sign in first." };
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    await supabase.rpc("mark_payment_failed", {
      p_order_id: razorpayOrderId,
    });
    return { success: false, error: "Payment verification failed." };
  }

  const { data: finalized, error: rpcError } = await supabase.rpc(
    "finalize_elite_payment",
    {
      p_order_id: razorpayOrderId,
      p_payment_id: razorpayPaymentId,
      p_period_days: ELITE_PERIOD_DAYS,
    }
  );

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }
  if (!finalized) {
    return { success: false, error: "We couldn't find that order." };
  }

  return { success: true };
}

// Razorpay Subscriptions requires a fixed total_count of billing
// cycles — there's no "until cancelled" option. 100 cycles of the
// 6-month plan is ~50 years, which is effectively that in practice;
// cancelSubscription() below is the real stop button.
const ELITE_SUBSCRIPTION_TOTAL_COUNT = 100;

export type CreateSubscriptionResult =
  | { error: string }
  | { subscriptionId: string; keyId: string };

/**
 * Creates a Razorpay Subscription against the Plan configured via
 * RAZORPAY_PLAN_ID (a one-time setup the founder does in the Razorpay
 * dashboard — see README) and records its id on the member's own
 * profile via start_elite_subscription() (supabase/schema.sql, Phase
 * 14). The actual grant — Elite tier, expiry, a payments row — only
 * ever happens later, from the subscription.charged webhook event in
 * src/app/api/webhooks/razorpay/route.ts, once Razorpay confirms
 * money actually moved. This action and verifySubscriptionPayment()
 * below just get the checkout flow started and let the UI move on
 * quickly instead of blocking on the webhook.
 */
export async function createEliteSubscription(): Promise<CreateSubscriptionResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!keyId || !keySecret) {
    return {
      error:
        "Payments aren't configured yet — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.",
    };
  }
  if (!planId) {
    return {
      error:
        "Auto-renewal isn't configured yet — add RAZORPAY_PLAN_ID to your environment variables (see README).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in first." };
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  let subscription;
  try {
    subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: ELITE_SUBSCRIPTION_TOTAL_COUNT,
      customer_notify: 1,
      notes: { profile_id: user.id, plan: "elite" },
    });
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not start checkout — please try again.",
    };
  }

  const { error: rpcError } = await supabase.rpc("start_elite_subscription", {
    p_subscription_id: subscription.id,
  });
  if (rpcError) {
    return { error: rpcError.message };
  }

  return { subscriptionId: subscription.id, keyId };
}

/**
 * Verifies a completed subscription checkout's signature (the
 * documented razorpay_payment_id|subscription_id HMAC-SHA256 check,
 * per Razorpay's Subscriptions integration guide — note the field
 * order is reversed from the one-time-order check above). Unlike
 * verifyElitePayment(), this does NOT itself grant Elite or write a
 * payments row — see the comment on createEliteSubscription() above
 * for why that's the webhook's job. A failed check here just means
 * the UI shows an error instead of quietly refreshing; it isn't what
 * stands between a member and unpaid access, since nothing this
 * function does moves subscription_tier either way.
 */
export async function verifySubscriptionPayment(
  razorpaySubscriptionId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<VerifyPaymentResult> {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return { success: false, error: "Payments aren't configured yet." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Please sign in first." };
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return { success: false, error: "Payment verification failed." };
  }

  return { success: true };
}

export type CancelSubscriptionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Stops future auto-renewal without touching the member's current
 * Elite access — cancel_at_cycle_end so Razorpay doesn't charge again,
 * while whatever's already been paid for keeps running until
 * subscription_expires_at, same as if they'd let a one-time purchase
 * lapse on its own. record_subscription_cancel_requested()
 * (supabase/schema.sql, Phase 14) records the intent immediately; the
 * webhook moves the status on to 'cancelled' once Razorpay confirms
 * the final cycle has actually ended.
 */
export async function cancelSubscription(): Promise<CancelSubscriptionResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return { success: false, error: "Payments aren't configured yet." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Please sign in first." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("razorpay_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.razorpay_subscription_id) {
    return { success: false, error: "You don't have an auto-renewing subscription to cancel." };
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    await razorpay.subscriptions.cancel(profile.razorpay_subscription_id, true);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not cancel — please try again.",
    };
  }

  const { error: rpcError } = await supabase.rpc(
    "record_subscription_cancel_requested"
  );
  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  return { success: true };
}
