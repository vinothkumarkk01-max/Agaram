"use client";

import { useEffect, useRef } from "react";
import { resolveMockVerification } from "@/app/actions/verification";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Stands in for waiting on the real vendor's async result. Auto-submits
 * the mock-resolve action a couple of seconds after this screen mounts,
 * so the pending -> verified transition is visible and testable today,
 * without real HyperVerge credentials.
 *
 * TO GO LIVE: once the real vendor call is wired up (likely via a
 * webhook route instead of this timer), delete the auto-submit below.
 * This page will keep working unchanged in the meantime — it only
 * ever reads `identity_verifications.status` from the database.
 */
export function VerificationPending({ t }: { t: Dictionary }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <div
        className="w-12 h-12 rounded-full animate-spin"
        style={{
          border: "3px solid var(--line)",
          borderTopColor: "var(--accent-strong)",
        }}
      />
      <p
        className="text-sm text-center"
        style={{ color: "var(--text-soft)" }}
      >
        {t.onboarding.checkingDetails}
      </p>
      <form ref={formRef} action={resolveMockVerification} className="hidden" />
    </div>
  );
}
