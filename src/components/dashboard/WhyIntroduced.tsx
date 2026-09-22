import type { Dictionary } from "@/lib/i18n/dictionary";
import type { CompatibilityLine } from "@/lib/matchReasons";

/**
 * "Why we introduced you" — the dashboard redesign's signature
 * explanation panel (Sept 2026). Deliberately renders exactly what
 * buildCompatibilityBreakdown() already computes for Browse's own
 * "Compatibility" list (see CandidateCard) — never a score, a rank, or
 * anything invented for this card specifically. A category is simply
 * left out when the breakdown has nothing honest to say about it,
 * same rule matchReasons.ts already documents.
 */
export function WhyIntroduced({
  lines,
  t,
}: {
  lines: CompatibilityLine[];
  t: Dictionary;
}) {
  if (lines.length === 0) return null;

  return (
    <div>
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--accent-strong)" }}
      >
        {t.dashboard.whyIntroducedHeading}
      </div>
      <ul className="flex flex-col">
        {lines.map((line, i) => (
          <li
            key={line.label}
            className="flex items-center justify-between gap-4 py-2 text-sm"
            style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
          >
            <span style={{ color: "var(--text)" }}>{line.label}</span>
            <span
              className="font-semibold text-right shrink-0"
              style={{ color: line.strength === "strong" ? "var(--ok)" : "var(--warn)" }}
            >
              {line.strength === "strong" ? t.dashboard.alignmentStrong : t.dashboard.alignmentGood}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
