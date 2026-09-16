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
