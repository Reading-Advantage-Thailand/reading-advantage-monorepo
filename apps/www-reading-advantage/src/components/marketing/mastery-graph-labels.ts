import type { MasteryGraphLabels } from "./mastery-advantage-graph";

const KEYS = [
  "idle", "forgetting", "reviewing", "reviewed", "reviewedTag", "ready", "readyTag",
  "learning", "unlocked", "expandedOne", "expandedMany", "pathUpdated", "svgLabel",
  "example", "planned", "tabsLabel", "controlsLabel", "play", "pause", "previous",
  "next", "stepOf", "whatsNext", "nextTitle", "nextHere", "nextReady", "nextNone",
] as const;

const STATES = ["mastered", "here", "ready", "locked"] as const;

/** Builds the graph labels from a translator scoped to `pages.masteryAdvantage`. */
export function graphLabelsFrom(t: (key: string) => string): MasteryGraphLabels {
  const labels = Object.fromEntries(
    KEYS.map((k) => [k, t(`explorer.labels.${k}`)]),
  ) as Record<(typeof KEYS)[number], string>;
  const states = Object.fromEntries(
    STATES.map((k) => [k, t(`explorer.labels.states.${k}`)]),
  ) as MasteryGraphLabels["states"];
  return { ...labels, states };
}
