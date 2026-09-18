import type { Dictionary } from "@/lib/i18n/dictionary";

/**
 * The four conversation stages a mutual match can be tagged with,
 * per the PRD (§8/§12). Kept as a single source of truth so the
 * server action's validation, the database CHECK constraint, and
 * every screen that renders a stage label all agree on the exact
 * set of values.
 */
export const MESSAGE_MILESTONES = [
  "getting_to_know",
  "family_intro",
  "video_call",
  "planning_to_meet",
] as const;

export type MessageMilestone = (typeof MESSAGE_MILESTONES)[number];

export function isMessageMilestone(value: string): value is MessageMilestone {
  return (MESSAGE_MILESTONES as readonly string[]).includes(value);
}

export function milestoneLabel(t: Dictionary, milestone: MessageMilestone): string {
  switch (milestone) {
    case "getting_to_know":
      return t.matches.milestoneGettingToKnow;
    case "family_intro":
      return t.matches.milestoneFamilyIntro;
    case "video_call":
      return t.matches.milestoneVideoCall;
    case "planning_to_meet":
      return t.matches.milestonePlanningToMeet;
  }
}
