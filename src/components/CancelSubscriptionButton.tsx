"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelSubscription } from "@/app/actions/payments";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function CancelSubscriptionButton({ t }: { t: Dictionary }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    const result = await cancelSubscription();
    setLoading(false);
    if (result.success) {
      setConfirming(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold self-start"
        style={{ color: "var(--accent-strong)" }}
      >
        {t.account.cancelAutoRenew}
      </button>
    );
  }

  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--bg-sunken)" }}>
      <p className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
        {t.account.cancelAutoRenewConfirm}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="text-xs font-bold disabled:opacity-60"
          style={{ color: "var(--accent-strong)" }}
        >
          {loading ? t.account.cancelling : t.account.cancelAutoRenew}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-xs font-semibold"
          style={{ color: "var(--text-soft)" }}
        >
          {t.common.cancel}
        </button>
      </div>
      {error && (
        <p className="text-xs mt-2" style={{ color: "var(--accent-strong)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
