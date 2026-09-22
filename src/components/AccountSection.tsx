import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "ok" | "warn" | "accent";

function badgeColor(tone: BadgeTone): string {
  switch (tone) {
    case "ok":
      return "var(--ok)";
    case "warn":
      return "var(--warn)";
    case "accent":
      return "var(--accent-strong)";
    default:
      return "var(--text-soft)";
  }
}

/**
 * Customer feedback (Sept 2026): /account was one long stack of ~13
 * fully-expanded cards — far too much scrolling to find any one
 * setting. This turns every section into a native <details>/<summary>
 * disclosure instead: collapsed by default, with a short status
 * badge in the header so most of what matters (added a photo? Elite
 * or Free? phone verified?) is visible WITHOUT opening anything, and
 * the full form/content only renders visibly once a member taps the
 * section they actually came for.
 *
 * Deliberately plain HTML <details>, not a client component with
 * useState — it's keyboard- and screen-reader-accessible for free,
 * needs no JavaScript to work, and every section can stay a plain
 * server-rendered block exactly like before. `group` + `group-open:`
 * (Tailwind's documented pattern for this exact element pair) rotates
 * the chevron when a section is open; the two marker-hiding selectors
 * remove the browser's own default disclosure triangle in both the
 * Chromium/Safari (`::-webkit-details-marker`) and Firefox (`::marker`)
 * implementations, so only our own chevron shows.
 */
export function AccountSection({
  id,
  title,
  badge,
  badgeTone = "neutral",
  danger = false,
  children,
}: {
  id?: string;
  title: string;
  badge?: string;
  badgeTone?: BadgeTone;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      className="group rounded-2xl overflow-hidden scroll-mt-6"
      style={{
        background: danger ? "var(--accent-soft)" : "var(--bg-raised)",
        border: "1px solid var(--line)",
      }}
    >
      <summary
        className="cursor-pointer select-none flex items-center justify-between gap-3 px-6 py-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden"
      >
        <span
          className="text-base font-bold"
          style={{ color: danger ? "var(--accent-strong)" : "var(--text)" }}
        >
          {title}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {badge && (
            <span className="text-xs font-semibold" style={{ color: badgeColor(badgeTone) }}>
              {badge}
            </span>
          )}
          <span
            aria-hidden
            className="inline-block transition-transform duration-150 group-open:rotate-90"
            style={{ color: "var(--text-soft)" }}
          >
            ›
          </span>
        </span>
      </summary>
      <div className="px-6 pb-6 pt-0">{children}</div>
    </details>
  );
}
