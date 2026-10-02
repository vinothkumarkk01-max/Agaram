/**
 * Small, explicit on/off switches for features that are built and
 * wired up in code, but deliberately not shown to users yet — kept
 * here instead of an env var so the "why" travels with the code and
 * flipping it back on is a one-line change, not a redeploy-time
 * config hunt.
 */

/**
 * "Continue with Apple" needs a paid Apple Developer Program
 * membership ($99/year) plus a Services ID + Sign in with Apple key
 * configured in Supabase (Authentication → Providers → Apple) before
 * it can actually work — see OAuthButtons.tsx and ConnectedAccounts.tsx
 * for where this is read. Until that's set up, clicking the button
 * would just fail with a Supabase "provider not enabled" error, so
 * it's hidden rather than shown broken. The signInWithApple action
 * (actions/auth.ts) and the Apple linking flow (ConnectedAccounts.tsx)
 * are both already fully implemented — flip this to true once the
 * Apple Developer + Supabase setup is done, no other code change
 * needed.
 */
export const APPLE_SIGNIN_ENABLED = false;
