"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1" style={{ borderBottom: "1px solid var(--line)" }}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-3 py-2.5 text-sm font-semibold"
            style={{
              color: active ? "var(--accent-strong)" : "var(--text-soft)",
              borderBottom: active
                ? "2px solid var(--accent-strong)"
                : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
