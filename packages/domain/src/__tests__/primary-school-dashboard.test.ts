import { describe, expect, it } from "vitest";
import { schoolDashboardSchema } from "../primary-dashboards/school-contracts.js";
import {
  cefrMainLevel,
  compareCefrMainLevel,
  licenseEndedAlert,
  licenseEndsSoonAlert,
  lowActivityAlert,
  seatsNearlyFullAlert,
  sortAlerts,
} from "../primary-dashboards/school-rules.js";

const SCHOOL = "10000000-0000-4000-8000-00000000000a";

describe("cefrMainLevel", () => {
  const levels: Array<[string, string]> = [
    ["A0-", "A0"], ["A0", "A0"], ["A0+", "A0"],
    ["A1-", "A1"], ["A1", "A1"], ["A1+", "A1"],
    ["A2-", "A2"], ["A2", "A2"], ["A2+", "A2"],
    ["B1-", "B1"], ["B1", "B1"], ["B1+", "B1"],
    ["B2-", "B2"], ["B2", "B2"], ["B2+", "B2"],
    // The scale has no row above B2 (owner default 2026-10-13): C1 and C2 count in B2.
    ["C1", "B2"], ["C1+", "B2"], ["c2", "B2"],
  ];
  it.each(levels)("counts %s in %s", (level, main) => expect(cefrMainLevel(level)).toBe(main));
  it("counts a missing or unreadable level as A0", () => {
    expect(cefrMainLevel(null)).toBe("A0");
    expect(cefrMainLevel(undefined)).toBe("A0");
    expect(cefrMainLevel("")).toBe("A0");
    expect(cefrMainLevel("???")).toBe("A0");
  });
  it("sorts the scale in order", () => {
    expect(["B2", "A1", "A0", "B1", "A2"].sort(compareCefrMainLevel)).toEqual(["A0", "A1", "A2", "B1", "B2"]);
  });
});

describe("lowActivityAlert", () => {
  it("fires under 30 percent, high under 10 percent", () => {
    expect(lowActivityAlert(29, 100)?.severity).toBe("medium");
    expect(lowActivityAlert(30, 100)).toBeNull();
    expect(lowActivityAlert(9, 100)?.severity).toBe("high");
    expect(lowActivityAlert(10, 100)?.severity).toBe("medium");
    expect(lowActivityAlert(0, 5)?.severity).toBe("high");
  });
  it("gives no alert for a school with no students", () => {
    expect(lowActivityAlert(0, 0)).toBeNull();
  });
});

describe("licenseEndsSoonAlert", () => {
  it("is critical at 7 days or less, medium to 30 days, and none after", () => {
    expect(licenseEndsSoonAlert(0)?.severity).toBe("critical");
    expect(licenseEndsSoonAlert(7)?.severity).toBe("critical");
    expect(licenseEndsSoonAlert(8)?.severity).toBe("medium");
    expect(licenseEndsSoonAlert(30)?.severity).toBe("medium");
    expect(licenseEndsSoonAlert(31)).toBeNull();
    expect(licenseEndsSoonAlert(null)).toBeNull();
  });
});

describe("licenseEndedAlert", () => {
  it("is critical when the license ended", () => {
    expect(licenseEndedAlert(true)?.severity).toBe("critical");
    expect(licenseEndedAlert(false)).toBeNull();
  });
});

describe("seatsNearlyFullAlert", () => {
  it("is high from 90 percent, critical from 100 percent", () => {
    expect(seatsNearlyFullAlert(89, 100)).toBeNull();
    expect(seatsNearlyFullAlert(90, 100)?.severity).toBe("high");
    expect(seatsNearlyFullAlert(99, 100)?.severity).toBe("high");
    expect(seatsNearlyFullAlert(100, 100)?.severity).toBe("critical");
    expect(seatsNearlyFullAlert(120, 100)?.severity).toBe("critical");
  });
  it("gives no alert when the school has no seats (no active license)", () => {
    expect(seatsNearlyFullAlert(218, 0)).toBeNull();
  });
});

describe("sortAlerts", () => {
  it("drops null and sorts critical, high, medium", () => {
    const sorted = sortAlerts([
      lowActivityAlert(20, 100),
      null,
      seatsNearlyFullAlert(95, 100),
      licenseEndedAlert(true),
    ]);
    expect(sorted.map((a) => a.severity)).toEqual(["critical", "high", "medium"]);
  });
});

describe("schoolDashboardSchema", () => {
  const empty = {
    schoolId: SCHOOL,
    range: 30,
    startDay: "2026-09-13",
    endDay: "2026-10-12",
    kpis: {
      activeStudents: { active: 0, total: 0, percent: null },
      activeTeachers: { active: 0, total: 0 },
      classesWithActivity: { active: 0, total: 0 },
      articlesOpened: 0,
      xpEarned: 0,
      newStudents: 0,
    },
    adoptionByCefr: [],
    adoptionByGrade: [],
    alerts: [],
    teachers: [],
    activityByDay: { days: [], totalEvents: 0, peakDay: null, dailyAverage: 0 },
  };
  it("accepts an empty school", () => {
    expect(schoolDashboardSchema.parse(empty)).toEqual(empty);
  });
  it("rejects a bad range, a negative count, and an unknown alert code", () => {
    expect(() => schoolDashboardSchema.parse({ ...empty, range: 14 })).toThrow();
    expect(() => schoolDashboardSchema.parse({ ...empty, kpis: { ...empty.kpis, xpEarned: -1 } })).toThrow();
    expect(() => schoolDashboardSchema.parse({ ...empty, alerts: [{ code: "x", severity: "high", values: {} }] })).toThrow();
  });
});
