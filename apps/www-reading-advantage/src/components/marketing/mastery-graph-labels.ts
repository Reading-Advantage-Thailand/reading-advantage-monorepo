import type { MasteryGraphLabels } from "./mastery-advantage-graph";

const KEYS = [
  "idle", "forgetting", "reviewing", "reviewed", "reviewedTag", "ready", "readyTag",
  "learning", "unlocked", "expandedOne", "expandedMany", "pathUpdated", "svgLabel",
  "example", "planned", "tabsLabel", "controlsLabel", "play", "pause", "previous",
  "next", "stepOf", "whatsNext", "nextTitle", "nextHere", "nextReady", "nextNone",
] as const;

const STATES = ["mastered", "here", "ready", "locked"] as const;

/** Placeholders the client fills in; next-intl returns them unchanged when passed as values. */
const KEEP = { n: "{n}", current: "{current}", total: "{total}", cluster: "{cluster}" };

/** Builds the graph labels from a translator scoped to `pages.masteryAdvantage`. */
export function graphLabelsFrom(
  t: (key: string, values?: Record<string, string>) => string,
): MasteryGraphLabels {
  const labels = Object.fromEntries(
    KEYS.map((k) => [k, t(`explorer.labels.${k}`, KEEP)]),
  ) as Record<(typeof KEYS)[number], string>;
  const states = Object.fromEntries(
    STATES.map((k) => [k, t(`explorer.labels.states.${k}`)]),
  ) as MasteryGraphLabels["states"];
  return { ...labels, states };
}
