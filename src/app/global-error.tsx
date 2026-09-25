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
          {/* Plain <img>, not next/image or the shared BrandMark
              component — this file replaces the ROOT layout entirely
              (see the file-level comment above) and must not depend on
              anything layout.tsx or the rest of the app would normally
              provide. */}
          <img
            src="/brand/agaramiya-mark-tight.png"
            alt={t.common.brand}
            width={56}
            height={56}
            style={{
              width: 56,
              height: 56,
              borderRadius: "9999px",
              margin: "0 auto 24px",
              display: "block",
              objectFit: "cover",
            }}
          />
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>
            {t.errors.couldntLoad}
          </h1>
          <p style={{ fontSize: 15, color: "#716b70", marginBottom: 28 }}>
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
              fontSize: 15,
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
