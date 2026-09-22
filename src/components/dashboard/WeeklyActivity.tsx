import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * "This week" (right column) — deliberately just the two real, current
 * counts the dashboard already fetches (received interests, mutual
 * matches) plus the next digest date, not an invented "N introductions
 * this week" tally — there's no weekly-introduction-count tracking in
 * this app (today's featured intro is a single daily pick, not a
 * counted stream, see dashboardIntro.ts). Each row links straight to
 * what it summarizes, same pattern as the old activity strip this
 * replaces.
 */
export function WeeklyActivity({
  t,
  pendingReceivedCount,
  mutualCount,
  nextDigestLabel,
}: {
  t: Dictionary;
  pendingReceivedCount: number;
  mutualCount: number;
  nextDigestLabel: string | null;
}) {
  const hasActivity = pendingReceivedCount > 0 || mutualCount > 0;

  return (
    <div className="rounded-xl p-4 text-sm" style={{ background: "var(--bg-sunken)" }}>
      <div className="font-semibold mb-2">{t.dashboard.thisWeekHeading}</div>
      {hasActivity ? (
        <div className="flex flex-col">
          {pendingReceivedCount > 0 && (
            <Link
              href="/matches/received"
              className="flex items-center justify-between gap-3 py-1.5"
            >
              <span style={{ color: "var(--text-soft)" }}>{t.dashboard.waitingForResponse}</span>
              <span className="font-semibold">{pendingReceivedCount}</span>
            </Link>
          )}
          {mutualCount > 0 && (
            <Link
              href="/matches/mutual"
              className="flex items-center justify-between gap-3 py-1.5"
              style={pendingReceivedCount > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
            >
              <span style={{ color: "var(--text-soft)" }}>{t.dashboard.mutualMatchesLabel}</span>
              <span className="font-semibold">{mutualCount}</span>
            </Link>
          )}
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-soft)" }}>
          {t.dashboard.thisWeekNoActivity}
        </p>
      )}
      {nextDigestLabel && (
        <p className="text-xs mt-2 pt-2" style={{ color: "var(--text-soft)", borderTop: "1px solid var(--line)" }}>
          {t.dashboard.digestNextPrefix}
          {nextDigestLabel}
        </p>
      )}
    </div>
  );
}
