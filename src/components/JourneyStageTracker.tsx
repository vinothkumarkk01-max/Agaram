import { saveIntentStage } from "@/app/actions/profile";
import type { Dictionary } from "@/lib/i18n/dictionary";

export type IntentStage =
  | "exploring"
  | "actively_looking"
  | "talking"
  | "family_discussions"
  | "meeting"
  | "paused"
  | "married";

const STAGES: IntentStage[] = [
  "exploring",
  "actively_looking",
  "talking",
  "family_discussions",
  "meeting",
  "paused",
  "married",
];

export function stageLabel(t: Dictionary, stage: IntentStage): string {
  switch (stage) {
    case "exploring":
      return t.account.journeyStageExploring;
    case "actively_looking":
      return t.account.journeyStageActivelyLooking;
    case "talking":
      return t.account.journeyStageTalking;
    case "family_discussions":
      return t.account.journeyStageFamilyDiscussions;
    case "meeting":
      return t.account.journeyStageMeeting;
    case "paused":
      return t.account.journeyStagePaused;
    case "married":
      return t.account.journeyStageMarried;
  }
}

/**
 * PRD §6's "intent / stage state" as a visible journey rather than a
 * private settings field (per the PRD §18 P1 backlog item this round
 * picks up) — a self-only reflection tool, never shown to the other
 * side of a match and never read by matching/filtering logic (see the
 * schema.sql Phase 31 comment). Plain server-rendered forms, same
 * pattern as the digest/instant-alerts toggles elsewhere on this
 * page — no client JS needed for a row of buttons that each just
 * submit one value.
 */
export function JourneyStageTracker({
  t,
  currentStage,
}: {
  t: Dictionary;
  currentStage: IntentStage;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STAGES.map((stage) => {
        const active = stage === currentStage;
        return (
          <form key={stage} action={saveIntentStage.bind(null, stage)}>
            <button
              type="submit"
              disabled={active}
              className="rounded-xl px-3.5 py-2 text-xs font-semibold disabled:cursor-default"
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                      color: "#fff",
                    }
                  : {
                      background: "var(--bg-sunken)",
                      border: "1px solid var(--line)",
                      color: "var(--text-soft)",
                    }
              }
            >
              {stageLabel(t, stage)}
            </button>
          </form>
        );
      })}
    </div>
  );
}
