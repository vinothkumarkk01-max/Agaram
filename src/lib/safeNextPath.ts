/**
 * Validates a "where to send the member next" value carried through a
 * form/redirect (e.g. the family-invite flow's `/family/join?code=...`,
 * or an OAuth callback's `next` query param) so it can never become an
 * open redirect: only a same-site relative path is accepted, and never
 * back to /login or /signup themselves (which would just loop).
 *
 * Shared by src/app/actions/auth.ts (email/password + OAuth sign-in
 * actions) and src/app/auth/callback/route.ts (the OAuth code-exchange
 * handler) — pulled out to its own module because a "use server" file
 * may only export async Server Actions, not a plain sync helper.
 */
export function safeNextPath(raw: unknown): string {
  const next = String(raw ?? "");
  if (
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/login") &&
    !next.startsWith("/signup")
  ) {
    return next;
  }
  return "/dashboard";
}
