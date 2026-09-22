"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locale";
import { BrandMark } from "@/components/BrandMark";
import { LocaleToggle } from "@/components/LocaleToggle";
import { MultiPillGroup } from "@/components/MultiPillGroup";
import { priorityFocusOptions } from "@/lib/priorityFocus";

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
  onContinue,
}: {
  locale: Locale;
  t: Dictionary;
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
