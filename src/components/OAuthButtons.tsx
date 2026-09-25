import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * Shared "Continue with Google" / "Continue with Apple" buttons — used
 * by AuthForm (login, and signup's email/password fallback step) and
 * SignupIntentStep (signup's first screen, where tapping one of these
 * skips the "who is this for" questions entirely and goes straight to
 * the provider's consent screen; see SignupIntentStep's own comment).
 *
 * `googleAction`/`appleAction` are the signInWithGoogle/signInWithApple
 * Server Actions from actions/auth.ts, passed in rather than imported
 * here so this stays a plain presentational component two different
 * screens can reuse without each redefining the button markup.
 */
export function OAuthButtons({
  t,
  next,
  googleAction,
  appleAction,
}: {
  t: Dictionary;
  /** Carried through as a hidden field, same as AuthForm's own `next`
   *  prop — see safeNextPath in src/lib/safeNextPath.ts. */
  next?: string;
  googleAction: (formData: FormData) => void | Promise<void>;
  appleAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <form action={googleAction}>
        {next && <input type="hidden" name="next" value={next} />}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold"
          style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)", color: "var(--text)" }}
        >
          <GoogleIcon />
          {t.auth.continueWithGoogle}
        </button>
      </form>
      <form action={appleAction}>
        {next && <input type="hidden" name="next" value={next} />}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold"
          style={{ background: "#000000", color: "#FFFFFF" }}
        >
          <AppleIcon />
          {t.auth.continueWithApple}
        </button>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.87 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true">
      <path d="M13.03 9.56c.02 2.36 2.06 3.15 2.08 3.16-.02.06-.33 1.12-1.08 2.22-.65.96-1.33 1.91-2.4 1.93-1.05.02-1.39-.62-2.59-.62-1.2 0-1.58.6-2.57.64-1.03.04-1.82-1.03-2.48-1.98C2.68 13.8 1.7 10.83 3 8.8c.65-1 1.8-1.64 3.06-1.66 1.01-.02 1.96.68 2.58.68.61 0 1.77-.84 2.99-.72.51.02 1.94.2 2.85 1.55-.07.05-1.7 1-1.68 2.9zM10.9 3.3c.54-.65.9-1.56.8-2.47-.78.03-1.72.52-2.28 1.17-.5.57-.94 1.49-.82 2.37.86.07 1.75-.44 2.3-1.07z" />
    </svg>
  );
}
