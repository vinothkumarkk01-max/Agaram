import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * "Your family" (right column) — reflects the REAL account_links
 * model: a member can invite exactly one family collaborator at a time
 * (see supabase/schema.sql's account_links_one_live_per_owner unique
 * index), who gets read-only visibility into shared matches, never
 * messages. This deliberately does NOT show a multi-person "Mother /
 * Father" list — the data model has no per-relation rows to show, so
 * inventing named family members here would be exactly the fabrication
 * this redesign's own data-integrity rule forbids. "Your family, your
 * way" — involvement is opt-in and shown honestly as whatever state it
 * actually is in.
 */
export function FamilyPanel({
  t,
  status,
  collaboratorName,
}: {
  t: Dictionary;
  status: "none" | "pending" | "active";
  collaboratorName: string | null;
}) {
  return (
    <div className="rounded-xl p-4 text-sm" style={{ background: "var(--bg-sunken)" }}>
      <div className="font-semibold mb-2">{t.dashboard.familyHeading}</div>
      <p className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
        {status === "active"
          ? `${collaboratorName ?? t.family.collaboratorHelpingFallback}${t.dashboard.familyActiveSuffix}`
          : status === "pending"
            ? t.dashboard.familyPendingBody
            : t.dashboard.familyNoneBody}
      </p>
      <Link href="/account#family" className="text-xs font-semibold" style={{ color: "var(--accent-strong)" }}>
        {t.dashboard.familyManage}
      </Link>
    </div>
  );
}
