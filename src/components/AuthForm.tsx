"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/actions/auth";

type Props = {
  mode: "login" | "signup";
  action: (
    state: AuthFormState,
    formData: FormData
  ) => Promise<AuthFormState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isSignup = mode === "signup";

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            அ
          </div>
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: "var(--text-soft)" }}
          >
            Agaram Premium
          </span>
        </div>

        <div
          className="rounded-2xl p-8 shadow-sm"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
            {isSignup
              ? "Start with your email — you can add everything else after."
              : "Sign in to continue to your account."}
          </p>

          <form action={formAction} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-soft)" }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-soft)" }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                }}
                placeholder="At least 8 characters"
              />
            </div>

            {state?.error && (
              <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl py-3 font-bold text-white text-sm mt-1 disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              {pending
                ? "Please wait…"
                : isSignup
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p
            className="text-center text-xs mt-6"
            style={{ color: "var(--text-soft)" }}
          >
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold" style={{ color: "var(--accent-strong)" }}>
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to Agaram?{" "}
                <Link href="/signup" className="font-semibold" style={{ color: "var(--accent-strong)" }}>
                  Create an account
                </Link>
              </>
            )}
          </p>
          {isSignup && (
            <p
              className="text-center text-xs mt-3"
              style={{ color: "var(--text-soft)" }}
            >
              By creating an account, you agree to our{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
