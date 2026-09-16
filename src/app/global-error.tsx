"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { getClientDictionary } from "@/lib/i18n/client";

// Only renders if the ROOT layout itself throws (everything below it
// is caught by app/error.tsx instead). Per
// node_modules/next/dist/docs/.../error.md this replaces the root
// layout entirely, must define its own <html>/<body>, and doesn't get
// layout.tsx's fonts or globals.css — hence the inline styles and
// system font stack instead of the app's usual --font-display /
// --font-body tokens.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const { locale, t } = getClientDictionary();

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          background: "#faf7f2",
          color: "#252225",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "384px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "9999px",
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 24,
              background: "linear-gradient(135deg, #8e2346, #64182f)",
            }}
          >
            அ
          </div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>
            {t.errors.couldntLoad}
          </h1>
          <p style={{ fontSize: 14, color: "#716b70", marginBottom: 28 }}>
            {t.errors.errorSubtitleBase}
            {error.digest
              ? `${t.errors.errorSubtitleReferencePrefix}${error.digest}${t.errors.errorSubtitleReferenceSuffix}`
              : ""}
          </p>
          <button
            onClick={() => retry()}
            style={{
              borderRadius: 12,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg, #8e2346, #64182f)",
            }}
          >
            {t.errors.tryAgain}
          </button>
        </div>
      </body>
    </html>
  );
}
