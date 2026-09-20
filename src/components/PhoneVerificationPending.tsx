"use client";

import { useEffect, useRef } from "react";
import { resolveMockPhoneVerification } from "@/app/actions/phone";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Stands in for waiting on a real SMS vendor's delivery + confirmation
 * — same pattern as components/VerificationPending.tsx for identity
 * verification, just embedded inline on /account instead of a full
 * onboarding step. Auto-submits the mock-resolve action a couple of
 * seconds after this mounts, so the pending -> verified transition is
 * visible and testable today, without a real Twilio/MSG91 account.
 */
export function PhoneVerificationPending({ t }: { t: Dictionary }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-soft)" }}>
      <div
        className="w-4 h-4 rounded-full animate-spin shrink-0"
        style={{ border: "2px solid var(--line)", borderTopColor: "var(--accent-strong)" }}
      />
      {t.account.phoneVerifying}
      <form ref={formRef} action={resolveMockPhoneVerification} className="hidden" />
    </div>
  );
}
