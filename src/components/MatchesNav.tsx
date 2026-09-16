"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function MatchesNav({ t }: { t: Dictionary }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/matches", label: t.matches.tabBrowse },
    { href: "/matches/sent", label: t.matches.tabSent },
    { href: "/matches/received", label: t.matches.tabReceived },
    { href: "/matches/mutual", label: t.matches.tabMutual },
  ];

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
