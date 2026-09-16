/**
 * Locale plumbing shared by both the server (Server Components, Server
 * Functions) and the client (the two error boundaries, which must be
 * Client Components and so can't call `next/headers`). Kept dependency-free
 * (no `next/headers` import here) so this file is safe to import from
 * either side — see `server.ts` / `client.ts` for the two read paths.
 */
export type Locale = "en" | "ta";

export const LOCALE_COOKIE = "agaram_locale";
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "ta";
}

/** BCP-47 tag for `Intl`/`toLocaleDateString` calls, so dates read naturally
 * in whichever language is active (Tamil month/weekday names under `ta-IN`,
 * not just re-skinned English UI text around an English date). */
export function intlLocale(locale: Locale): string {
  return locale === "ta" ? "ta-IN" : "en-IN";
}
