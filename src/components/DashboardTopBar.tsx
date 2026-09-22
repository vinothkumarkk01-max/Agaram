"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { BrandMark } from "@/components/BrandMark";
import { LocaleToggle } from "@/components/LocaleToggle";
import { ProfilePhotoAvatar } from "@/components/ProfilePhotoAvatar";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locale";

/**
 * Dashboard top-bar chrome — shown on both mobile and desktop.
 * Started desktop-only (Sept 2026): founder feedback comparing a
 * competitor's app screens asked for the brand name, a notification
 * icon and a menu to read as real top-bar chrome, not a stacked list
 * of links at the bottom of a mobile-width card stretched across a
 * wide screen — "we should build App view and desktop view
 * differently." A follow-up round (also Sept 2026, referencing the
 * same competitor's actual mobile app) asked for the same treatment
 * on mobile too, so this now renders at every width; only the locale
 * toggle and the menu button's name label step out below the `md`
 * breakpoint (`hidden md:...`) to keep the bar from crowding on a
 * phone-width screen — the locale switch still lives in the mobile
 * card's own footer (dashboard/page.tsx), so it's still reachable
 * there, just not duplicated in both places.
 *
 * The notification bell is deliberately honest about having nothing
 * behind it yet: no unread badge, no invented count. Opening it shows
 * a plain "you're all caught up" state, consistent with the "never
 * show what isn't real" rule the rest of this app already follows
 * (see TrustProfileSummary's comment for the same principle applied
 * to verification signals).
 */
export function DashboardTopBar({
  t,
  locale,
  name,
  initial,
  photoUrl,
  isAdmin,
  hasFamilyLink,
}: {
  t: Dictionary;
  locale: Locale;
  name?: string;
  initial: string;
  photoUrl?: string | null;
  isAdmin: boolean;
  hasFamilyLink: boolean;
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const linkStyle = { color: "var(--text)" } as const;

  return (
    <div
      className="flex items-center justify-between px-4 md:px-6 py-3"
      style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-2.5">
        <BrandMark size={32} />
        <span
          className="text-base font-bold"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          {t.common.brand}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:block">
          <LocaleToggle locale={locale} />
        </div>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v);
              setMenuOpen(false);
            }}
            aria-label={t.dashboard.notificationsLabel}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
          >
            <BellIcon />
          </button>
          {notifOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-xl p-4 text-xs shadow-sm z-20"
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--line)",
                color: "var(--text-soft)",
              }}
            >
              {t.dashboard.noNotificationsYet}
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setNotifOpen(false);
            }}
            aria-label={t.dashboard.menuLabel}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5"
            style={{ background: "var(--bg-sunken)" }}
          >
            <ProfilePhotoAvatar url={photoUrl} initial={initial} size={28} />
            {name && (
              <span
                className="hidden md:inline-block text-sm font-semibold max-w-[120px] truncate"
                style={{ color: "var(--text)" }}
              >
                {name}
              </span>
            )}
            <ChevronDownIcon />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl p-1.5 text-sm shadow-sm z-20"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
            >
              <Link href="/onboarding/basic-info" className="block rounded-lg px-3 py-2" style={linkStyle}>
                {t.dashboard.editProfile}
              </Link>
              <Link href="/account" className="block rounded-lg px-3 py-2" style={linkStyle}>
                {t.dashboard.accountPrivacy}
              </Link>
              {hasFamilyLink && (
                <Link href="/family" className="block rounded-lg px-3 py-2" style={linkStyle}>
                  {t.family.title}
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="block rounded-lg px-3 py-2" style={linkStyle}>
                  {t.dashboard.adminDashboard}
                </Link>
              )}
              <Link href="/privacy" className="block rounded-lg px-3 py-2" style={linkStyle}>
                {t.common.privacyPolicy}
              </Link>
              <div className="my-1.5" style={{ borderTop: "1px solid var(--line)" }} />
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full text-left rounded-lg px-3 py-2"
                  style={{ color: "var(--text-soft)" }}
                >
                  {t.dashboard.signOut}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--text-soft)" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
