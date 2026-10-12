import { describe, expect, it } from "vitest";
import { activityScopeSchema, dashboardRangeSchema } from "../primary-dashboards/contracts.js";
import { dashboardWindow } from "../primary-dashboards/window.js";

describe("dashboardRangeSchema", () => {
  it.each([
    [7, 7],
    ["7", 7],
    [30, 30],
    ["90", 90],
    [90, 90],
  ])("reads %j as %i", (input, expected) => {
    expect(dashboardRangeSchema.parse(input)).toBe(expected);
  });

  it.each([[undefined], [null], [""], ["abc"], ["8"], [0], [-7], [365], [[7]], [{}]])("gives 30 for %j", (input) => {
    expect(dashboardRangeSchema.parse(input)).toBe(30);
  });
});

describe("dashboardWindow", () => {
  // 12 October 2026, 10:00 in Bangkok.
  const now = new Date("2026-10-12T10:00:00+07:00");

  it("covers N Bangkok days with today included", () => {
    const w = dashboardWindow(7, now);
    expect(w.dayKeys).toEqual(["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12"]);
    expect(w.startDay).toBe("2026-10-06");
    expect(w.endDay).toBe("2026-10-12");
    expect(w.start.toISOString()).toBe("2026-10-05T17:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-10-12T17:00:00.000Z");
  });

  it("uses the Bangkok day, not the UTC day, near midnight", () => {
    // 23:30 UTC on 11 October is 06:30 on 12 October in Bangkok.
    const w = dashboardWindow(30, new Date("2026-10-11T23:30:00Z"));
    expect(w.endDay).toBe("2026-10-12");
    expect(w.dayKeys).toHaveLength(30);
    expect(w.startDay).toBe("2026-09-13");
    // 16:59 UTC on 12 October is 23:59 in Bangkok: still 12 October.
    expect(dashboardWindow(7, new Date("2026-10-12T16:59:00Z")).endDay).toBe("2026-10-12");
    expect(dashboardWindow(7, new Date("2026-10-12T17:00:00Z")).endDay).toBe("2026-10-13");
  });

  it("crosses a month and a year", () => {
    const w = dashboardWindow(90, new Date("2027-01-10T05:00:00Z"));
    expect(w.dayKeys).toHaveLength(90);
    expect(w.startDay).toBe("2026-10-13");
    expect(w.dayKeys[w.dayKeys.length - 1]).toBe("2027-01-10");
  });
});

describe("activityScopeSchema", () => {
  it("accepts a school scope with a UUID", () => {
    expect(activityScopeSchema.parse({ kind: "school", schoolId: "10000000-0000-4000-8000-00000000000a" })).toEqual({
      kind: "school",
      schoolId: "10000000-0000-4000-8000-00000000000a",
    });
  });

  it("rejects a scope that is not a school scope or has a bad id", () => {
    expect(() => activityScopeSchema.parse({ kind: "school", schoolId: "x" })).toThrow();
    expect(() => activityScopeSchema.parse({ kind: "platform" })).toThrow();
    expect(() => activityScopeSchema.parse({ kind: "classes", schoolId: "10000000-0000-4000-8000-00000000000a" })).toThrow();
  });
});
