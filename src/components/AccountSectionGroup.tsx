import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Account page redesign (Sept 2026) — groups several compact
 * AccountSection "row" variants under one shared card and a small
 * uppercase eyebrow heading, instead of each item drawing its own
 * full card. This is the wrapper the brief's "PROFILE & PREFERENCES /
 * TRUST & VERIFICATION / MEMBERSHIP / NOTIFICATIONS / FAMILY / SAFETY
 * & PRIVACY / ACCOUNT" information architecture is built from — see
 * AccountSection's `variant="row"` for the rows themselves.
 */
export function AccountSectionGroup({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2
        className="text-xs font-bold uppercase tracking-wider px-1"
        style={{ color: "var(--text-soft)" }}
      >
        {heading}
      </h2>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A single non-expanding row for a group — a plain link or an inline
 * control (the locale toggle, a static value), sized and padded to
 * match AccountSection's row variant so the two interleave cleanly.
 */
export function AccountRow({
  label,
  href,
  right,
  divider = false,
}: {
  label: string;
  href?: string;
  right?: ReactNode;
  divider?: boolean;
}) {
  const inner = (
    <>
      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {label}
      </span>
      <span className="flex items-center gap-2 shrink-0 text-sm" style={{ color: "var(--text-soft)" }}>
        {right}
        {href && (
          <span aria-hidden style={{ color: "var(--text-soft)" }}>
            ›
          </span>
        )}
      </span>
    </>
  );

  const className = "flex items-center justify-between gap-3 px-6 py-4";
  const style = { borderTop: divider ? "1px solid var(--line)" : undefined };

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} style={style}>
      {inner}
    </div>
  );
}
