"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/locale";

/**
 * Sets the UI language cookie and re-renders everything (`'/', 'layout'`
 * is the documented "revalidate all data" call) so the page you're on
 * picks up the new language immediately, without a full navigation.
 * Not `httpOnly` — see `src/lib/i18n/client.ts` for why the two error
 * boundaries need to read it directly.
 */
export async function setLocale(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
