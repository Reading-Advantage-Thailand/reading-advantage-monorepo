import { describe, expect, it } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { helpEventReport, recordHelpEvent } from "../events.js";
import { recordHelpEventInput } from "../contracts.js";

const SCHOOL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NOW = new Date("2026-10-23T08:00:00Z");
const teacher: UserContext = { id: "t1", username: "t1", name: "T", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const student: UserContext = { ...teacher, id: "s1", role: "STUDENT" };
const system: UserContext = { ...teacher, id: "y1", role: "SYSTEM", schoolId: null };
const inserted = (mock: ReturnType<typeof createMockDb>) => mock.insert.mock.results[0].value.values.mock.calls[0][0] as Record<string, unknown>;
const whereOf = (mock: ReturnType<typeof createMockDb>, i: number) =>
  new PgDialect().sqlToQuery(mock.select.mock.results[i].value.from.mock.results[0].value.where.mock.calls[0][0] as SQL);

describe("recordHelpEventInput (FR-11)", () => {
  it("accepts an open and a play, and rejects a bad id, source, or path", () => {
    expect(recordHelpEventInput.parse({ event: "open", routePattern: "/teacher/class-roster/[id]", matched: 5 }).event).toBe("open");
    expect(recordHelpEventInput.parse({ event: "play", routePattern: "/student/home", videoId: "C1", source: "file" }).event).toBe("play");
    expect(() => recordHelpEventInput.parse({ event: "play", routePattern: "/student/home", videoId: "Z1", source: "file" })).toThrow();
    expect(() => recordHelpEventInput.parse({ event: "play", routePattern: "/student/home", videoId: "C1", source: "tiktok" })).toThrow();
    expect(() => recordHelpEventInput.parse({ event: "open", routePattern: "/student/<script>", matched: 0 })).toThrow();
    expect(() => recordHelpEventInput.parse({ event: "open", routePattern: "/student/home" })).toThrow();
  });
});

describe("recordHelpEvent (FR-11)", () => {
  it("writes a play with the school and the role, and no user id", async () => {
    const mock = createMockDb();
    const out = await recordHelpEvent({ db: mock as unknown as DB, user: student, input: { event: "play", routePattern: "/student/home", videoId: "C1", source: "file" } });
    expect(out).toEqual({ recorded: true });
    expect(inserted(mock)).toEqual({ schoolId: SCHOOL, role: "STUDENT", event: "play", routePattern: "/student/home", videoId: "C1", source: "file", matched: null });
  });

  it("writes an open with the number of matched videos", async () => {
    const mock = createMockDb();
    await recordHelpEvent({ db: mock as unknown as DB, user: teacher, input: { event: "open", routePattern: "/teacher/my-students", matched: 0 } });
    expect(inserted(mock)).toMatchObject({ role: "TEACHER", event: "open", videoId: null, source: null, matched: 0 });
  });

  it("writes nothing for a user with no school", async () => {
    const mock = createMockDb();
    const out = await recordHelpEvent({ db: mock as unknown as DB, user: { ...teacher, schoolId: null }, input: { event: "open", routePattern: "/teacher/dashboard", matched: 1 } });
    expect(out).toEqual({ recorded: false });
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("refuses a role with no help button", async () => {
    const mock = createMockDb();
    await expect(recordHelpEvent({ db: mock as unknown as DB, user: system, input: { event: "open", routePattern: "/system/dashboard", matched: 0 } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.insert).not.toHaveBeenCalled();
  });
});

describe("helpEventReport (FR-12)", () => {
  const plays = [{ videoId: "B4", role: "TEACHER", last7: 2, last30: 5 }];
  const opens = [{ routePattern: "/teacher/class-roster/[id]", last7: 3, last30: 9 }];
  const unmatched = [{ routePattern: "/teacher/my-students", last7: 1, last30: 1 }];
  const schools = [{ id: SCHOOL, name: "Boonyathat" }];

  it("returns plays per video and role, opens per page, opens with no video, and the schools", async () => {
    const mock = createMockDb({ selectSequence: [plays, opens, unmatched, schools] });
    expect(await helpEventReport({ db: mock as unknown as DB, user: system, now: NOW })).toEqual({ plays, opens, unmatched, schools });
    const where = whereOf(mock, 0);
    expect(where.params).toEqual(["play", "2026-09-23T08:00:00.000Z"]);
    expect(whereOf(mock, 2).sql).toContain('"matched" = $');
  });

  it("filters by one school", async () => {
    const mock = createMockDb({ selectSequence: [[], [], [], []] });
    await helpEventReport({ db: mock as unknown as DB, user: system, now: NOW, input: { schoolId: SCHOOL } });
    expect(whereOf(mock, 1).params).toContain(SCHOOL);
  });

  it("is for the system role only (AC-8)", async () => {
    const mock = createMockDb();
    await expect(helpEventReport({ db: mock as unknown as DB, user: teacher, now: NOW })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.select).not.toHaveBeenCalled();
  });
});
