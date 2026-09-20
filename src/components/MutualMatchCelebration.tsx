"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";

type ConfettiPiece = {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
};

const CONFETTI_COLORS = [
  "var(--accent)",
  "var(--accent-strong)",
  "var(--ok)",
  "var(--warn)",
  "#FFFFFF",
];

const CONFETTI_COUNT = 40;

// Deterministic, index-derived "randomness" (not Math.random()) —
// this component is server-rendered on the first pass like any other
// Client Component, and Math.random() would produce different values
// between that server pass and the client's hydration pass, which
// React reports as a hydration mismatch. A fixed formula per index
// gives every piece a different position/timing/color while staying
// byte-identical between server and client.
const CONFETTI_PIECES: ConfettiPiece[] = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 7) % 12) * 0.05,
  duration: 2.2 + ((i * 11) % 15) * 0.1,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  rotate: (i * 53) % 360,
}));

/**
 * PRD §18's P1 backlog item, picked up this round: "a dedicated
 * mutual-match celebration moment... a fuller celebratory treatment"
 * instead of the mutual list simply reading as a state change. Pure
 * CSS confetti (no library, no Math.random() — see CONFETTI_PIECES'
 * comment above for why).
 */
export function MutualMatchCelebration({
  t,
  headline,
  body,
  ctaHref,
  ctaLabel,
}: {
  t: Dictionary;
  headline: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(37, 34, 37, 0.55)" }}
    >
      <style>{`
        @keyframes agaram-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0.9; }
        }
      `}</style>
      <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none">
        {CONFETTI_PIECES.map((p, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${p.left}%`,
              top: "-10px",
              width: "8px",
              height: "14px",
              background: p.color,
              borderRadius: "2px",
              transform: `rotate(${p.rotate}deg)`,
              animation: `agaram-confetti-fall ${p.duration}s ease-in ${p.delay}s 1 both`,
            }}
          />
        ))}
      </div>

      <div
        className="relative w-full max-w-sm rounded-2xl p-7 text-center"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
      >
        <div className="text-4xl mb-2">🎉</div>
        <h2
          className="text-xl mb-2"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          {headline}
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
          {body}
        </p>
        <div className="flex flex-col gap-2.5">
          <Link
            href={ctaHref}
            onClick={() => setDismissed(true)}
            className="inline-block rounded-xl py-2.5 px-5 font-bold text-white text-sm"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs font-semibold"
            style={{ color: "var(--text-soft)" }}
          >
            {t.matches.justMatchedDismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
