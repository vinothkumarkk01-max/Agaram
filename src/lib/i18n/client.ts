"use client";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locale";
import { dictionaries, type Dictionary } from "./dictionary";

/**
 * Client-side read path, for the two error boundaries only
 * (`error.tsx`, `global-error.tsx`) — React requires these to be
 * Client Components, so they can't call `next/headers`. The locale
 * cookie is deliberately not `httpOnly` (it's a UI preference, not a
 * secret) specifically so this works: a plain `document.cookie` read,
 * no round trip needed.
 */
function getClientLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`)
  );
  const value = match ? decodeURIComponent(match[1]) : undefined;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getClientDictionary(): { locale: Locale; t: Dictionary } {
  const locale = getClientLocale();
  return { locale, t: dictionaries[locale] };
}
