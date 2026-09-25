import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safeNextPath";

/**
 * Where Google/Apple send the browser back after the consent screen
 * (see signInWithGoogle/signInWithApple in actions/auth.ts, and
 * ConnectedAccounts.tsx's linkIdentity() calls, which use this same
 * route). Exchanges the one-time `code` for a real session — the
 * standard Supabase + Next.js App Router PKCE pattern — using the same
 * cookie-bound server client that started the flow, so it can read
 * back the code_verifier Supabase stashed in a cookie at that point.
 *
 * middleware.ts treats any /auth/* path as an "auth route" it redirects
 * *signed-in* visitors away from — that's never a problem here: at the
 * moment this request reaches middleware there's no session cookie yet
 * (exchangeCodeForSession hasn't run), so `user` is null and that
 * redirect never fires. It only takes effect on the *next* request,
 * after this handler's own redirect below.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing code, or the exchange failed (expired/reused link, denied
  // consent, provider not enabled in the Supabase dashboard yet, …) —
  // send them back to sign in rather than at a dead route.
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
