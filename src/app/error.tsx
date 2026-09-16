"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { getClientDictionary } from "@/lib/i18n/client";

// Wraps every route segment below the root layout (so it keeps the
// fonts/theme from layout.tsx — global-error.tsx, for the root
// layout itself, can't). Reports to Sentry once per thrown error,
// then offers `retry()` — the primary recovery action per
// node_modules/next/dist/docs/.../error.md ("In most cases, you
// should use retry() instead [of reset()]").
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const { t } = getClientDictionary();

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="text-center max-w-sm">
        <div
          className="w-14 h-14 rounded-full mx-auto mb-6 flex items-center justify-center text-white font-bold text-2xl shadow-sm"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          அ
        </div>
        <h1
          className="text-2xl mb-2"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          {t.errors.somethingWrong}
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-soft)" }}>
          {t.errors.errorSubtitleBase}
          {error.digest
            ? `${t.errors.errorSubtitleReferencePrefix}${error.digest}${t.errors.errorSubtitleReferenceSuffix}`
            : ""}
        </p>
        <button
          onClick={() => retry()}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          {t.errors.tryAgain}
        </button>
      </div>
    </div>
  );
}
