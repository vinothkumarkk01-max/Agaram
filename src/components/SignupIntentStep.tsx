"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locale";
import { BrandMark } from "@/components/BrandMark";
import { LocaleToggle } from "@/components/LocaleToggle";
import { MultiPillGroup } from "@/components/MultiPillGroup";
import { OAuthButtons } from "@/components/OAuthButtons";
import { priorityFocusOptions } from "@/lib/priorityFocus";
import { signInWithGoogle, signInWithApple } from "@/app/actions/auth";

export type SignupIntent = {
  lookingFor: "self" | "child" | "family";
  priorities: string[];
};

/**
 * The first screen of signup — founder feedback (Sept 2026): the old
 * flow opened with "Start with your email — you can add everything
 * else after," which was "technically simple, but not emotionally
 * engaging." This screen replaces that opener with two warm, human
 * questions before any account-creation field appears, so onboarding
 * starts to feel like matchmaking rather than filling out a form.
 * Deliberately mirrors AuthForm's own shell (logo row, card, locale
 * toggle) rather than importing it, so this stays a self-contained
 * screen and never risks changing anything about the login page,
 * which renders AuthForm directly and never sees this component.
 *
 * Nothing here is a final answer: "I am looking for" is a coarser,
 * friendlier version of the "Who's setting up this profile?" question
 * BasicInfoForm already asks in more detail right after signup — this
 * just pre-fills that later dropdown with a sensible starting point
 * (see the mapping in BasicInfoForm.tsx), always still editable there.
 * "What matters most to you" is a lightweight, self-reported signal —
 * not a substitute for the detailed, progressive preference tiers
 * that deliberately stay on /account (see schema.sql Phase 25's
 * comment for why those were kept off onboarding).
 */
export function SignupIntentStep({
  locale,
  t,
  next,
  onContinue,
}: {
  locale: Locale;
  t: Dictionary;
  /** Where to land after Google/Apple sign-in — same `next` AuthForm
   *  already threads through for email/password. See safeNextPath. */
  next?: string;
  onContinue: (intent: SignupIntent) => void;
}) {
  const [lookingFor, setLookingFor] = useState<SignupIntent["lookingFor"]>("self");
  const [priorities, setPriorities] = useState<string[]>([]);

  const lookingForOptions: { value: SignupIntent["lookingFor"]; label: string }[] = [
    { value: "self", label: t.auth.lookingForSelf },
    { value: "child", label: t.auth.lookingForChild },
    { value: "family", label: t.auth.lookingForFamily },
  ];

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
          <BrandMark size={40} />
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: "var(--text-soft)" }}
          >
            {t.common.brand}
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
            {t.auth.signupIntroTitle}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
            {t.auth.signupIntroSubtitle}
          </p>

          {/* Google/Apple (Sept 2026) — deliberately the fastest path
              through this whole screen: tapping either skips both
              questions below AND the email/password step after this
              one, going straight to the provider's consent screen.
              "Who's this for" / "what matters most" aren't lost — the
              first is asked again, in more detail, on basic-info right
              after (see its relationDefaultFromLookingFor comment);
              the second stays a gap for now, same as any other signal
              this app already asks about progressively rather than at
              signup. */}
          <OAuthButtons t={t} next={next} googleAction={signInWithGoogle} appleAction={signInWithApple} />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
            <span className="text-xs" style={{ color: "var(--text-soft)" }}>
              {t.auth.orDivider}
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
          </div>

          {/* Sept 2026 — founder feedback: this "or" divider looks
              identical to the one on /login, but what follows it isn't
              an alternative sign-in form like login's — it's two quick
              questions, not an email field. Reusing the bare "or" with
              no explanation made that switch feel like a mismatch. This
              line names what's actually coming before it arrives. */}
          <p className="text-xs font-semibold mb-4" style={{ color: "var(--text-soft)" }}>
            {t.auth.signupIntentOrHint}
          </p>

          <div className="flex flex-col gap-6">
            <div>
              <div
                className="text-xs font-semibold mb-2.5"
                style={{ color: "var(--text-soft)" }}
              >
                {t.auth.lookingForQuestion}
              </div>
              <div className="flex flex-col gap-2">
                {lookingForOptions.map((opt) => {
                  const isSelected = lookingFor === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLookingFor(opt.value)}
                      aria-pressed={isSelected}
                      className="flex items-center gap-3 text-left rounded-xl px-3.5 py-3 text-sm"
                      style={
                        isSelected
                          ? {
                              background: "var(--accent-soft)",
                              border: "1.5px solid var(--accent-strong)",
                              color: "var(--accent-strong)",
                              fontWeight: 600,
                            }
                          : {
                              background: "var(--bg-sunken)",
                              border: "1.5px solid var(--line)",
                              color: "var(--text)",
                            }
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="shrink-0 rounded-full"
                        style={{
                          width: "16px",
                          height: "16px",
                          border: `1.5px solid ${isSelected ? "var(--accent-strong)" : "var(--text-soft)"}`,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSelected && (
                          <span
                            className="rounded-full"
                            style={{
                              width: "8px",
                              height: "8px",
                              background: "var(--accent-strong)",
                            }}
                          />
                        )}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div
                className="text-xs font-semibold mb-1"
                style={{ color: "var(--text-soft)" }}
              >
                {t.onboarding.priorityQuestion}
              </div>
              <p className="text-xs mb-2.5" style={{ color: "var(--text-soft)" }}>
                {t.onboarding.priorityHelp}
              </p>
              <MultiPillGroup
                defaultValue={priorities}
                onChange={setPriorities}
                options={priorityFocusOptions(t)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onContinue({ lookingFor, priorities })}
            className="w-full rounded-xl py-3 font-bold text-white text-sm mt-7"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            {t.onboarding.continueBtn}
          </button>

          <p
            className="text-center text-xs mt-6"
            style={{ color: "var(--text-soft)" }}
          >
            {t.auth.alreadyHaveAccount}{" "}
            <Link href="/login" className="font-semibold" style={{ color: "var(--accent-strong)" }}>
              {t.auth.signInLink}
            </Link>
          </p>
        </div>

        <div className="flex justify-center mt-6">
          <LocaleToggle locale={locale} />
        </div>
      </div>
    </div>
  );
}
