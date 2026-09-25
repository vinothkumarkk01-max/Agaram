"use client";

import { useState } from "react";
import { AuthForm } from "@/components/AuthForm";
import { SignupIntentStep, type SignupIntent } from "@/components/SignupIntentStep";
import { signup } from "@/app/actions/auth";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locale";

/**
 * Two screens, one signup: SignupIntentStep asks "who is this for" and
 * "what matters most to you" first (founder feedback, Sept 2026 — see
 * that component's comment), then this hands off to the existing
 * email/password AuthForm, carrying the answers through as hidden
 * fields so the `signup` action can remember them for onboarding.
 * The login page is untouched — it renders AuthForm directly and
 * never sees this wizard.
 *
 * AuthForm renders here with showOAuth={false} (Sept 2026 founder
 * feedback: reaching step 2 already means the person answered the
 * intent questions and tapped Continue — i.e. explicitly chose the
 * manual path over Google/Apple, which is offered up front on
 * SignupIntentStep. Repeating "Continue with Google/Apple" here read
 * as an inconsistent flow, and tapping it would have silently thrown
 * away the answers just given — see AuthForm's showOAuth comment).
 */
export function SignupWizard({
  locale,
  t,
  next,
}: {
  locale: Locale;
  t: Dictionary;
  next?: string;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [intent, setIntent] = useState<SignupIntent>({ lookingFor: "self", priorities: [] });

  if (step === 1) {
    return (
      <SignupIntentStep
        locale={locale}
        t={t}
        next={next}
        onContinue={(answers) => {
          setIntent(answers);
          setStep(2);
        }}
      />
    );
  }

  return (
    <AuthForm
      mode="signup"
      action={signup}
      locale={locale}
      t={t}
      next={next}
      signupIntent={intent}
      onBack={() => setStep(1)}
      backLabel={t.auth.backToIntro}
      showOAuth={false}
    />
  );
}
