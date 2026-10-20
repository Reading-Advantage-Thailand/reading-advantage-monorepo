import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import th from "../../../messages/th.json";
import cn from "../../../messages/cn.json";
import tw from "../../../messages/tw.json";
import vi from "../../../messages/vi.json";

/** The keys that the teacher home added for the summary strip and the class table. */
const NEW_KEYS = [
  "stats.activeStudents",
  "stats.activeStudentsOf",
  "stats.noStudentsYet",
  "stats.averageLevel",
  "stats.averageLevelHint",
  "stats.activeToday",
  "stats.activeTodayOf",
  "stats.completedToday",
  "stats.completedTodayHint",
  "stats.needsHelpHint",
  "table.search",
  "table.searchLabel",
  "table.sortBy",
  "table.sortAsc",
  "table.sortDesc",
  "table.sortDirection",
  "table.csv",
  "table.csvLabel",
  "table.noMatch",
  "table.legend",
  "table.activeOf",
  "table.actions",
  "table.columns.name",
  "table.columns.students",
  "table.columns.active",
  "table.columns.level",
  "table.columns.xp",
  "table.columns.trend",
  "table.columns.status",
  "table.trend.up",
  "table.trend.flat",
  "table.trend.down",
  "table.status.onTrack",
  "table.status.someQuiet",
  "table.status.needsAttention",
  "table.status.noStudents",
];

/**
 * Lists the dotted paths of the string leaves of a message tree.
 * @param tree The message tree.
 * @param prefix The path so far.
 * @returns The sorted paths.
 */
function leaves(tree: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) => (typeof value === "string" ? [`${prefix}${key}`] : leaves(value as Record<string, unknown>, `${prefix}${key}.`)))
    .sort();
}

describe("TeacherHome key parity", () => {
  it("has every new key as a string in en", () => {
    const keys = leaves(en.TeacherHome);
    for (const key of NEW_KEYS) expect(keys, key).toContain(key);
  });

  it.each([["th", th], ["cn", cn], ["tw", tw], ["vi", vi]] as const)("has the same keys in %s as in en", (_name, messages) => {
    expect(leaves(messages.TeacherHome)).toEqual(leaves(en.TeacherHome));
  });
});
