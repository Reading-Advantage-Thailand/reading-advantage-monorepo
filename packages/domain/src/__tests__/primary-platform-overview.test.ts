import { describe, expect, it } from "vitest";
import { dashboardWindow } from "../primary-dashboards/window.js";
import { platformOverviewSchema } from "../primary-dashboards/platform-contracts.js";
import { platformSchoolStatus } from "../primary-dashboards/platform-rules.js";

const NOW = new Date("2026-10-12T10:00:00+07:00");
const DAY_MS = 86_400_000;
const SCHOOL = "10000000-0000-4000-8000-00000000000a";

const row = {
  id: SCHOOL,
  name: "School A",
  students: 5,
  activeStudents: 3,
  activePercent: 60,
  articlesOpened: 4,
  seatsUsed: 5,
  seats: 100,
  lastActivityAt: "2026-10-12T02:00:00.000Z",
  lastActivityDay: "2026-10-12",
  status: "active",
};
const totals = {
  schools: 1, students: 5, teachers: 2, activeStudents: 3, articlesOpened: 4, seatsUsed: 5, seats: 100, studentsWithoutSchool: 0,
};
const overview = { startDay: "2026-10-06", endDay: "2026-10-12", totals, schools: [row] };

describe("platformOverviewSchema", () => {
  it("accepts a full overview", () => {
    expect(platformOverviewSchema.parse(overview)).toEqual(overview);
  });
  it("accepts a school with no license, no students, and no activity", () => {
    const none = { ...row, students: 0, activeStudents: 0, activePercent: null, seatsUsed: 0, seats: null, lastActivityAt: null, lastActivityDay: null, status: "no_students" };
    expect(platformOverviewSchema.parse({ ...overview, schools: [none] }).schools[0]?.seats).toBeNull();
  });
  it("rejects an unknown status, a negative count, and a percent over 100", () => {
    expect(() => platformOverviewSchema.parse({ ...overview, schools: [{ ...row, status: "sleeping" }] })).toThrow();
    expect(() => platformOverviewSchema.parse({ ...overview, totals: { ...totals, students: -1 } })).toThrow();
    expect(() => platformOverviewSchema.parse({ ...overview, schools: [{ ...row, activePercent: 101 }] })).toThrow();
  });
  it("rejects a school id that is not a uuid", () => {
    expect(() => platformOverviewSchema.parse({ ...overview, schools: [{ ...row, id: "x" }] })).toThrow();
  });
});

describe("platformSchoolStatus (the quiet rule, 7 Bangkok days)", () => {
  const window = dashboardWindow(7, NOW);
  it("is active when the last activity was 6 days ago", () => {
    expect(platformSchoolStatus({ students: 3, lastActivityAt: new Date(NOW.getTime() - 6 * DAY_MS), window })).toBe("active");
  });
  it("is quiet when the last activity was 7 days ago", () => {
    expect(platformSchoolStatus({ students: 3, lastActivityAt: new Date(NOW.getTime() - 7 * DAY_MS), window })).toBe("quiet");
  });
  it("is active at the first instant of the window and quiet one millisecond before", () => {
    expect(platformSchoolStatus({ students: 1, lastActivityAt: window.start, window })).toBe("active");
    expect(platformSchoolStatus({ students: 1, lastActivityAt: new Date(window.start.getTime() - 1), window })).toBe("quiet");
  });
  it("is quiet when a school with students has no activity", () => {
    expect(platformSchoolStatus({ students: 2, lastActivityAt: null, window })).toBe("quiet");
  });
  it("is no_students for a school with no students, even with an old event", () => {
    expect(platformSchoolStatus({ students: 0, lastActivityAt: null, window })).toBe("no_students");
    expect(platformSchoolStatus({ students: 0, lastActivityAt: new Date(NOW.getTime() - 30 * DAY_MS), window })).toBe("no_students");
  });
});
