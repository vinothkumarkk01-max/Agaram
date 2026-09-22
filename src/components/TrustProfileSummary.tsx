import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";

type SignalStatus = "verified" | "pending" | "unverified";

function statusOf(raw: string | null | undefined): SignalStatus {
  if (raw === "verified") return "verified";
  if (raw === "pending") return "pending";
  // Covers both "no row yet" (null/undefined) and a landed
  // unable_to_verify/failed result — all three read the same way on
  // this compact summary: nothing to show off yet. The full status
  // (including "we couldn't verify this, here's why") still lives on
  // the actual verification screen this row links to.
  return "unverified";
}

function statusColor(status: SignalStatus): string {
  switch (status) {
    case "verified":
      return "var(--ok)";
    case "pending":
      return "var(--warn)";
    default:
      return "var(--text-soft)";
  }
}

function SignalRow({
  label,
  status,
  t,
  href,
  isFirst,
}: {
  label: string;
  status: SignalStatus;
  t: Dictionary;
  href: string;
  isFirst: boolean;
}) {
  const text =
    status === "verified"
      ? `✓ ${t.account.badgeVerified}`
      : status === "pending"
        ? t.account.badgePending
        : t.account.badgeNotVerified;

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 py-1.5"
      style={!isFirst ? { borderTop: "1px solid var(--line)" } : undefined}
    >
      <span style={{ color: "var(--text)" }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: statusColor(status) }}>
        {text}
      </span>
    </Link>
  );
}

/**
 * A compact, member-facing summary of every real trust signal the
 * platform actually has — Identity, Employment, Phone — placed near
 * the top of the dashboard rather than buried inside /account or
 * Browse. Two independent reviews this round (a competitor-analysis
 * pass and an external product review) both flagged the same gap:
 * the dashboard only ever surfaced Identity, and only as a single
 * gate rather than part of a member's own trust story.
 *
 * Deliberately limited to the three signals that are actually built
 * (`identity_verifications`, `employment_verifications`,
 * `phone_verifications`) — the PRD's five-signal model (adding
 * Professional/Education/Diaspora) is aspirational, not implemented,
 * and this card follows the same "never show what isn't real" rule
 * every other honesty-first piece of this app already follows (see
 * the match-explanation card's "no fabricated score" note). The "X of
 * Y verified" count is a plain, literal tally of real rows — not a
 * weighted or fabricated score.
 */
export function TrustProfileSummary({
  t,
  identityStatus,
  employmentStatus,
  phoneStatus,
}: {
  t: Dictionary;
  identityStatus: string | null | undefined;
  employmentStatus: string | null | undefined;
  phoneStatus: string | null | undefined;
}) {
  const signals = [
    { label: t.dashboard.trustIdentityLabel, status: statusOf(identityStatus), href: "/onboarding/verification" },
    { label: t.dashboard.trustEmploymentLabel, status: statusOf(employmentStatus), href: "/account#employment" },
    { label: t.dashboard.trustPhoneLabel, status: statusOf(phoneStatus), href: "/account#phone" },
  ];
  const verifiedCount = signals.filter((s) => s.status === "verified").length;

  return (
    <div className="rounded-xl p-4 text-sm" style={{ background: "var(--bg-sunken)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{t.dashboard.trustProfileHeading}</span>
        <span className="text-xs" style={{ color: "var(--text-soft)" }}>
          {t.dashboard.trustProfileSummaryPrefix}
          {verifiedCount}
          {t.dashboard.trustProfileSummaryOf}
          {signals.length}
          {t.dashboard.trustProfileSummarySuffix}
        </span>
      </div>
      <div className="flex flex-col">
        {signals.map((signal, index) => (
          <SignalRow
            key={signal.label}
            label={signal.label}
            status={signal.status}
            t={t}
            href={signal.href}
            isFirst={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
