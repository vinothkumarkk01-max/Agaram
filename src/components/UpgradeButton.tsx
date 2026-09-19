"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEliteOrder,
  createEliteSubscription,
  verifyElitePayment,
  verifySubscriptionPayment,
} from "@/app/actions/payments";
import type { Dictionary } from "@/lib/i18n/dictionary";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function UpgradeButton({
  userEmail,
  t,
  label,
}: {
  userEmail?: string;
  t: Dictionary;
  /** Overrides the default "Upgrade to Elite" label — used by the
   * renew flow (same checkout, different framing) on /upgrade. */
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Checked by default — auto-renew is the recommended path (Phase
  // 14) since it's the one that can't quietly lapse if life gets
  // busy around the six-month mark. Unchecking falls back to the
  // original one-time order (Phase 5), still fully supported.
  const [autoRenew, setAutoRenew] = useState(true);

  async function handleOneTimeCheckout() {
    const order = await createEliteOrder();
    if ("error" in order) {
      setError(order.error);
      setLoading(false);
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setError(t.upgrade.checkoutLoadError);
      setLoading(false);
      return;
    }

    const razorpay = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "Agaram Premium",
      description: "Elite — 6 months",
      prefill: userEmail ? { email: userEmail } : undefined,
      theme: { color: "#8E2346" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const result = await verifyElitePayment(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        );
        if (result.success) {
          router.refresh();
        } else {
          setError(result.error);
        }
        setLoading(false);
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    });

    razorpay.open();
  }

  async function handleSubscriptionCheckout() {
    const subscription = await createEliteSubscription();
    if ("error" in subscription) {
      setError(subscription.error);
      setLoading(false);
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setError(t.upgrade.checkoutLoadError);
      setLoading(false);
      return;
    }

    const razorpay = new window.Razorpay({
      key: subscription.keyId,
      subscription_id: subscription.subscriptionId,
      name: "Agaram Premium",
      description: "Elite — auto-renews every 6 months",
      prefill: userEmail ? { email: userEmail } : undefined,
      theme: { color: "#8E2346" },
      handler: async (response: {
        razorpay_subscription_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const result = await verifySubscriptionPayment(
          response.razorpay_subscription_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        );
        if (result.success) {
          router.refresh();
        } else {
          setError(result.error);
        }
        setLoading(false);
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    });

    razorpay.open();
  }

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    if (autoRenew) {
      await handleSubscriptionCheckout();
    } else {
      await handleOneTimeCheckout();
    }
  }

  return (
    <div>
      <label className="flex items-start gap-2.5 mb-3.5 text-xs" style={{ color: "var(--text-soft)" }}>
        <input
          type="checkbox"
          checked={autoRenew}
          onChange={(e) => setAutoRenew(e.target.checked)}
          className="mt-0.5"
        />
        <span>{t.upgrade.autoRenewLabel}</span>
      </label>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full rounded-xl py-4 font-bold text-white text-sm disabled:opacity-60"
        style={{
          background:
            "linear-gradient(135deg, var(--accent), var(--accent-strong))",
        }}
      >
        {loading ? t.upgrade.openingCheckout : label ?? t.upgrade.upgradeButtonLabel}
      </button>
      {error && (
        <p className="text-sm mt-3" style={{ color: "var(--accent-strong)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
