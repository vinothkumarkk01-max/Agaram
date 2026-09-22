/**
 * Shared between actions/auth.ts (writes the cookie), basic-info's
 * page.tsx (reads it) and actions/profile.ts (clears it) — kept out
 * of actions/auth.ts itself because a "use server" file may only
 * export async functions; a plain constant exported from one breaks
 * the whole module ("has no exports at all") at build time.
 */
export const SIGNUP_INTENT_COOKIE = "agaramiya_signup_intent";

export const VALID_LOOKING_FOR = ["self", "child", "family"];
