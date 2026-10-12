import { describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { getPlatformOverview } from "../primary-dashboards/platform.js";
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

describe("getPlatformOverview (recording DB, permission)", () => {
  const user = (role: UserContext["role"]): UserContext => ({
    id: `${role}-user`, username: role, name: role, role, schoolId: role === "SYSTEM" ? null : SCHOOL, xp: 0, level: 1, cefrLevel: "A1-",
  });
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);

  /** An `execute` stub: it renders each query and answers by the table that the query reads. */
  function recordingDb(schoolCount: number) {
    const queries: string[] = [];
    const dialect = new PgDialect();
    const execute = vi.fn(async (query: SQL) => {
      const text = dialect.sqlToQuery(query).sql;
      queries.push(text);
      if (text.includes("with stu as")) {
        return ids(schoolCount).map((id, i) => ({ id, name: `School ${i}`, students: 2, active: 1, articles: 3, last: "2026-10-12T02:00:00.000Z" }));
      }
      if (text.includes("from licenses l")) return ids(schoolCount).map((school_id) => ({ school_id, seats: 10, used: 2 }));
      if (text.includes("'TEACHER'")) return ids(schoolCount).map((school_id) => ({ school_id, n: 1 }));
      return [{ n: 0 }];
    });
    return { db: { execute } as unknown as DB, queries, execute };
  }

  it("runs the same number of queries for 1 school and for 25 schools, grouped by school_id", async () => {
    const one = recordingDb(1);
    const many = recordingDb(25);
    const a = await getPlatformOverview({ db: one.db, user: user("SYSTEM"), now: NOW });
    const b = await getPlatformOverview({ db: many.db, user: user("SYSTEM"), now: NOW });
    expect(a.schools).toHaveLength(1);
    expect(b.schools).toHaveLength(25);
    expect(one.execute).toHaveBeenCalledTimes(many.execute.mock.calls.length);
    expect(many.queries.length).toBeLessThanOrEqual(6);
    for (const text of many.queries.filter((q) => !q.includes("school_id is null"))) expect(text).toMatch(/group by/i);
    expect(b.totals).toMatchObject({ schools: 25, students: 50, teachers: 25, activeStudents: 25, articlesOpened: 75, seatsUsed: 50, seats: 250 });
    expect(platformOverviewSchema.parse(b)).toEqual(b);
  });

  it.each(["ADMIN", "TEACHER", "STUDENT"] as const)("gives %s FORBIDDEN and runs no query", async (role) => {
    const { db, execute } = recordingDb(1);
    await expect(getPlatformOverview({ db, user: user(role), now: NOW })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("lets SYSTEM pass", async () => {
    const { db } = recordingDb(1);
    await expect(getPlatformOverview({ db, user: user("SYSTEM"), now: NOW })).resolves.toBeDefined();
  });
});
