import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * The "what matters most to you" priorities asked at signup
 * (SignupIntentStep) and carried into BasicInfoForm — see
 * profiles.priority_focus (supabase/schema.sql Phase 32). One shared
 * list so the signup screen, the onboarding form, and the two server
 * actions that read/validate this field can't drift out of sync.
 *
 * `value` is what's actually stored in the database and passed
 * between client and server — a plain semantic slug, deliberately NOT
 * the dictionary key, so the stored data stays meaningful even if a
 * label gets reworded or the dictionary gets restructured later.
 * `labelKey` just points at the matching `onboarding.*` dictionary
 * entry for display.
 */
export const PRIORITY_OPTIONS = [
  { value: "values", labelKey: "priorityValues" },
  { value: "education", labelKey: "priorityEducation" },
  { value: "career", labelKey: "priorityCareer" },
  { value: "family", labelKey: "priorityFamily" },
  { value: "location", labelKey: "priorityLocation" },
  { value: "lifestyle", labelKey: "priorityLifestyle" },
  { value: "religion", labelKey: "priorityReligion" },
  { value: "jathagam", labelKey: "priorityJathagam" },
] as const satisfies { value: string; labelKey: keyof Dictionary["onboarding"] }[];

export const VALID_PRIORITY_FOCUS: string[] = PRIORITY_OPTIONS.map((o) => o.value);

export function priorityFocusOptions(t: Dictionary) {
  return PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: t.onboarding[o.labelKey] }));
}
