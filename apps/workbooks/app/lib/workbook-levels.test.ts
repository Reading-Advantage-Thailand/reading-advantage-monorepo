import { describe, expect, it } from "vitest";
import {
  ensureMetadataLevelOption,
  getWorkbookLevelOptions,
  PRIMARY_LEVELS,
  SECONDARY_LEVELS,
} from "./workbook-levels";

describe("workbook-levels", () => {
  it("exposes distinct primary and secondary level lists", () => {
    expect(PRIMARY_LEVELS.length).toBeGreaterThan(0);
    expect(SECONDARY_LEVELS.length).toBeGreaterThan(0);
    expect(getWorkbookLevelOptions("primary")).toBe(PRIMARY_LEVELS);
    expect(getWorkbookLevelOptions("secondary")).toBe(SECONDARY_LEVELS);
  });

  it("marks the primary early levels with A0 and the secondary with A1", () => {
    const primary1 = getWorkbookLevelOptions("primary").find(
      (option) => option.value === "1",
    );
    const secondary1 = getWorkbookLevelOptions("secondary").find(
      (option) => option.value === "1",
    );
    expect(primary1?.cefr).toBe("A0");
    expect(secondary1?.cefr).toBe("A1");
  });

  it("keeps an existing levelNumber that is not in the list as an extra option", () => {
    const options = ensureMetadataLevelOption(
      getWorkbookLevelOptions("secondary"),
      { seriesName: "Custom", levelNumber: "16", cefrLevel: "C1" },
    );
    expect(options[0]).toEqual({
      value: "16",
      series: "Custom",
      cefr: "C1",
      label: "16 - Custom",
    });
    expect(options).toContainEqual(SECONDARY_LEVELS[0]);
  });

  it("returns the list unchanged for a known levelNumber or missing settings", () => {
    expect(ensureMetadataLevelOption(SECONDARY_LEVELS, undefined)).toBe(
      SECONDARY_LEVELS,
    );
    expect(ensureMetadataLevelOption(SECONDARY_LEVELS, null)).toBe(
      SECONDARY_LEVELS,
    );
    expect(ensureMetadataLevelOption(SECONDARY_LEVELS, { levelNumber: "5" })).toBe(
      SECONDARY_LEVELS,
    );
  });
});
