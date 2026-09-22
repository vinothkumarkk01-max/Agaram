/**
 * "Complete your story" (dashboard, Sept 2026 redesign) — a plain,
 * honest tally of real profile signals, same pattern as
 * TrustProfileSummary's "2 of 3 verified": never a fabricated score,
 * just a literal count of things that are actually filled in, computed
 * from the same boolean checks /account already makes (hasBackground /
 * hasJathagam there, mirrored here) rather than a new metric invented
 * for this card. Five signals, each worth an equal fifth — there's no
 * weighting model behind this app's profile, so an even split is the
 * honest option rather than implying some fields matter more than
 * others.
 */
export type StorySignal = {
  key: "photo" | "aboutMe" | "employment" | "background" | "jathagam";
  done: boolean;
  href: string;
};

export function computeStoryCompleteness(input: {
  hasPhoto: boolean;
  hasAboutMe: boolean;
  employmentVerified: boolean;
  hasBackground: boolean;
  hasJathagam: boolean;
}): { percent: number; signals: StorySignal[]; nextSignal: StorySignal | null } {
  // Ordered by how much a missing one actually costs a member — a
  // photo or a line about yourself is what another member sees first,
  // so those lead; the cultural/optional fields trail.
  const signals: StorySignal[] = [
    { key: "photo", done: input.hasPhoto, href: "/account#photo" },
    { key: "aboutMe", done: input.hasAboutMe, href: "/onboarding/basic-info" },
    { key: "employment", done: input.employmentVerified, href: "/account#employment" },
    { key: "background", done: input.hasBackground, href: "/account#background" },
    { key: "jathagam", done: input.hasJathagam, href: "/account#jathagam" },
  ];

  const doneCount = signals.filter((s) => s.done).length;
  const percent = Math.round((doneCount / signals.length) * 100);
  const nextSignal = signals.find((s) => !s.done) ?? null;

  return { percent, signals, nextSignal };
}
