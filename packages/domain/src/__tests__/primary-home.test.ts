import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "./mock-db.js";
import { studentHomeOutput } from "../primary-home/contracts.js";
import { getStudentHome } from "../primary-home/home.js";

const SCHOOL = "22222222-2222-4222-8222-222222222222";
const A1 = "a1a1a1a1-0000-4000-8000-000000000001";
const A2 = "a2a2a2a2-0000-4000-8000-000000000002";
const A3 = "a3a3a3a3-0000-4000-8000-000000000003";
const student = { id: "s1", username: "s1", name: "Ann", role: "STUDENT" as const, schoolId: SCHOOL, xp: 10, level: 1, cefrLevel: "A1" };
const NOW = new Date("2026-10-05T15:00:00");
const asDb = (db: ReturnType<typeof createMockDb>) => db as unknown as DB;
const day = (s: string) => new Date(s);

/**
 * Builds the select results in query order: profile, next open assignment, article reads,
 * activity dates, finished articles, article rows.
 */
function sequence(parts: {
  profile?: unknown[];
  lesson?: unknown[];
  reads?: unknown[];
  activity?: unknown[];
  finished?: unknown[];
  articles?: unknown[];
}): unknown[][] {
  const base = [
    parts.profile ?? [{ xp: 1250, level: 3, cefrLevel: "A2" }],
    parts.lesson ?? [],
    parts.reads ?? [],
    parts.activity ?? [],
  ];
  return parts.reads?.length ? [...base, parts.finished ?? [], parts.articles ?? []] : base;
}

describe("getStudentHome", () => {
  it("returns XP, level, streak, the next open assignment, and the last unfinished article", async () => {
    const due = day("2026-10-07T00:00:00");
    const db = createMockDb({
      selectSequence: sequence({
        lesson: [{ assignmentId: "as-1", title: "Frogs", dueDate: due, status: "IN_PROGRESS" }],
        reads: [
          { articleId: A1, updatedAt: day("2026-10-05T09:00:00") },
          { articleId: A2, updatedAt: day("2026-10-04T09:00:00") },
        ],
        activity: [{ createdAt: day("2026-10-05T08:00:00") }, { createdAt: day("2026-10-04T08:00:00") }],
        // A1 has all three question types done, so A2 is the article to continue.
        finished: [{ articleId: A1 }],
        articles: [{ id: A2, title: "The Moon", cefrLevel: "A1", raLevel: 2 }],
      }),
    });

    const out = await getStudentHome({ db: asDb(db), user: student, now: NOW });

    expect(out).toEqual({
      xp: 1250,
      level: 3,
      cefrLevel: "A2",
      streakDays: 2,
      todayLesson: { assignmentId: "as-1", title: "Frogs", dueDate: due, started: true },
      continueReading: { articleId: A2, title: "The Moon", cefrLevel: "A1", raLevel: 2, lastReadAt: day("2026-10-04T09:00:00") },
    });
    expect(() => studentHomeOutput.parse(out)).not.toThrow();
  });

  it("hides the lesson and the reading card when the student has no open assignment and no reads", async () => {
    const db = createMockDb({ selectSequence: sequence({}) });
    const out = await getStudentHome({ db: asDb(db), user: student, now: NOW });
    expect(out.todayLesson).toBeNull();
    expect(out.continueReading).toBeNull();
    expect(out.streakDays).toBe(0);
    // No reads: the finished-article and article queries do not run.
    expect(db.select).toHaveBeenCalledTimes(4);
  });

  it("shows no article to continue when every read article is finished or deleted", async () => {
    const db = createMockDb({
      selectSequence: sequence({
        reads: [{ articleId: A1, updatedAt: NOW }, { articleId: A3, updatedAt: NOW }],
        finished: [{ articleId: A1 }],
        articles: [],
      }),
    });
    const out = await getStudentHome({ db: asDb(db), user: student, now: NOW });
    expect(out.continueReading).toBeNull();
  });

  it("skips read records whose target is not an article id", async () => {
    const db = createMockDb({
      selectSequence: sequence({ reads: [{ articleId: "not-a-uuid", updatedAt: NOW }] }),
    });
    const out = await getStudentHome({ db: asDb(db), user: student, now: NOW });
    expect(out.continueReading).toBeNull();
    // Only the four base queries run: no valid article id is left to look up.
    expect(db.select).toHaveBeenCalledTimes(4);
  });

  it("falls back to the session values when the user row is missing", async () => {
    const db = createMockDb({ selectSequence: sequence({ profile: [] }) });
    const out = await getStudentHome({ db: asDb(db), user: student, now: NOW });
    expect(out).toMatchObject({ xp: 10, level: 1, cefrLevel: "A1" });
  });

  it("marks a not-started assignment and keeps a missing due date as null", async () => {
    const db = createMockDb({
      selectSequence: sequence({ lesson: [{ assignmentId: "as-2", title: "Rain", dueDate: null, status: null }] }),
    });
    const out = await getStudentHome({ db: asDb(db), user: student, now: NOW });
    expect(out.todayLesson).toEqual({ assignmentId: "as-2", title: "Rain", dueDate: null, started: false });
  });

  it("rejects a user who is not a student", async () => {
    const db = createMockDb({ selectSequence: sequence({}) });
    await expect(getStudentHome({ db: asDb(db), user: { ...student, role: "TEACHER" }, now: NOW })).rejects.toThrow(
      /lacks permission/,
    );
    expect(db.select).not.toHaveBeenCalled();
  });
});
