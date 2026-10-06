import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { studentHomeOutput } from "../primary-home/contracts.js";
import { getStudentHome } from "../primary-home/home.js";

const SCHOOL = "22222222-2222-4222-8222-222222222222";
const A1 = "a1a1a1a1-0000-4000-8000-000000000001";
const A2 = "a2a2a2a2-0000-4000-8000-000000000002";
const A3 = "a3a3a3a3-0000-4000-8000-000000000003";
const student = { id: "s1", username: "s1", name: "Ann", role: "STUDENT" as const, schoolId: SCHOOL, xp: 10, level: 1, cefrLevel: "A1" };
/** 5 October 2026, 15:00 in Bangkok. */
const NOW = new Date("2026-10-05T15:00:00+07:00");
const day = (s: string) => new Date(s);
const dialect = new PgDialect();

/** One query the home ran: distinct or not, its selected fields, and its where clause. */
interface RecordedQuery {
  distinct: boolean;
  fields?: Record<string, SQL>;
  where?: SQL;
}

/**
 * A database stub: each select returns the next result in order and records its fields and its
 * where clause, so a test can render the SQL with the real Postgres dialect.
 * @param results The rows of each query, in query order.
 * @returns The stub (as DB) and the recorded queries.
 */
function recordingDb(results: unknown[][]) {
  const queries: RecordedQuery[] = [];
  let next = 0;
  const start = (distinct: boolean) => (fields?: Record<string, SQL>) => {
    const rows = results[next++] ?? [];
    const query: RecordedQuery = { distinct, fields };
    queries.push(query);
    const builder: Record<string, unknown> = {};
    for (const method of ["from", "innerJoin", "leftJoin", "orderBy", "limit", "groupBy"]) builder[method] = () => builder;
    builder.where = (condition: SQL) => {
      query.where = condition;
      return builder;
    };
    builder.then = (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject);
    return builder;
  };
  const db = { select: vi.fn(start(false)), selectDistinct: vi.fn(start(true)) };
  return { db: db as unknown as DB, queries };
}

/**
 * Builds the select results in query order: profile, next open assignment, article reads,
 * activity days, finished articles, article rows.
 */
function sequence(parts: {
  profile?: unknown[];
  lesson?: unknown[];
  reads?: unknown[];
  activityDays?: unknown[];
  finished?: unknown[];
  articles?: unknown[];
}): unknown[][] {
  const base = [
    parts.profile ?? [{ xp: 1250, level: 3, cefrLevel: "A2" }],
    parts.lesson ?? [],
    parts.reads ?? [],
    parts.activityDays ?? [],
  ];
  return parts.reads?.length ? [...base, parts.finished ?? [], parts.articles ?? []] : base;
}

describe("getStudentHome", () => {
  it("returns XP, level, streak, the next open assignment, and the last unfinished article", async () => {
    const due = day("2026-10-07T00:00:00+07:00");
    const { db } = recordingDb(
      sequence({
        lesson: [{ assignmentId: "as-1", title: "Frogs", dueDate: due, status: "IN_PROGRESS" }],
        reads: [
          { articleId: A1, updatedAt: day("2026-10-05T09:00:00Z") },
          { articleId: A2, updatedAt: day("2026-10-04T09:00:00Z") },
        ],
        activityDays: [{ day: "2026-10-05" }, { day: "2026-10-04" }],
        // A1 has all three question types done, so A2 is the article to continue.
        finished: [{ articleId: A1 }],
        articles: [{ id: A2, title: "The Moon", cefrLevel: "A1", raLevel: 2 }],
      }),
    );

    const out = await getStudentHome({ db, user: student, now: NOW });

    expect(out).toEqual({
      xp: 1250,
      level: 3,
      cefrLevel: "A2",
      streakDays: 2,
      todayLesson: { assignmentId: "as-1", title: "Frogs", dueDate: due, started: true },
      continueReading: { articleId: A2, title: "The Moon", cefrLevel: "A1", raLevel: 2, lastReadAt: day("2026-10-04T09:00:00Z") },
    });
    expect(() => studentHomeOutput.parse(out)).not.toThrow();
  });

  it("filters every query of the student's own rows on the student's id", async () => {
    const { db, queries } = recordingDb(
      sequence({
        reads: [{ articleId: A1, updatedAt: NOW }, { articleId: A2, updatedAt: NOW }],
        finished: [{ articleId: A1 }],
        articles: [{ id: A2, title: "The Moon", cefrLevel: "A1", raLevel: 2 }],
      }),
    );

    await getStudentHome({ db, user: student, now: NOW });

    const rendered = queries.map((query) => dialect.sqlToQuery(query.where!));
    expect(rendered).toHaveLength(6);
    const [profile, lesson, reads, streak, finished, articleRows] = rendered;
    expect(profile.sql).toMatch(/^"users"\."id" = \$1$/);
    expect(profile.params).toEqual(["s1"]);
    for (const [query, column] of [
      [lesson, `"student_assignments"."student_id"`],
      [reads, `"user_activity"."user_id"`],
      [streak, `"user_activity"."user_id"`],
      [finished, `"article_activity_logs"."user_id"`],
    ] as const) {
      // Each where clause is an AND that starts with the student filter.
      expect(query.sql.startsWith(`(${column} = $1 and `)).toBe(true);
      expect(query.params[0]).toBe("s1");
    }
    // The article lookup reads shared content (no owner column), and only the ids from the
    // student's own reads that are not finished.
    expect(articleRows.sql).toMatch(/^"articles"\."id" in \(\$1\)$/);
    expect(articleRows.params).toEqual([A2]);
  });

  it("reads the streak as distinct Bangkok calendar days, not every activity row", async () => {
    const { db, queries } = recordingDb(sequence({ activityDays: [{ day: "2026-10-05" }, { day: "2026-10-04" }, { day: "2026-10-03" }] }));

    const out = await getStudentHome({ db, user: student, now: NOW });

    expect(out.streakDays).toBe(3);
    const streak = queries[3];
    expect(streak.distinct).toBe(true);
    expect(Object.keys(streak.fields ?? {})).toEqual(["day"]);
    const daySql = dialect.sqlToQuery(streak.fields!.day).sql;
    // created_at is a UTC timestamp without a zone: read it as UTC, then take the Bangkok day.
    expect(daySql).toBe(
      `to_char(date_trunc('day', ("user_activity"."created_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'), 'YYYY-MM-DD')`,
    );
    // The window still limits the rows to the last 366 days.
    expect(dialect.sqlToQuery(streak.where!).sql).toMatch(/"user_activity"\."created_at" >= \$2/);
  });

  it("hides the lesson and the reading card when the student has no open assignment and no reads", async () => {
    const { db, queries } = recordingDb(sequence({}));
    const out = await getStudentHome({ db, user: student, now: NOW });
    expect(out.todayLesson).toBeNull();
    expect(out.continueReading).toBeNull();
    expect(out.streakDays).toBe(0);
    // No reads: the finished-article and article queries do not run.
    expect(queries).toHaveLength(4);
  });

  it("shows no article to continue when every read article is finished or deleted", async () => {
    const { db } = recordingDb(
      sequence({
        reads: [{ articleId: A1, updatedAt: NOW }, { articleId: A3, updatedAt: NOW }],
        finished: [{ articleId: A1 }],
        articles: [],
      }),
    );
    const out = await getStudentHome({ db, user: student, now: NOW });
    expect(out.continueReading).toBeNull();
  });

  it("skips read records whose target is not an article id", async () => {
    const { db, queries } = recordingDb(sequence({ reads: [{ articleId: "not-a-uuid", updatedAt: NOW }] }));
    const out = await getStudentHome({ db, user: student, now: NOW });
    expect(out.continueReading).toBeNull();
    // Only the four base queries run: no valid article id is left to look up.
    expect(queries).toHaveLength(4);
  });

  it("falls back to the session values when the user row is missing", async () => {
    const { db } = recordingDb(sequence({ profile: [] }));
    const out = await getStudentHome({ db, user: student, now: NOW });
    expect(out).toMatchObject({ xp: 10, level: 1, cefrLevel: "A1" });
  });

  it("marks a not-started assignment and keeps a missing due date as null", async () => {
    const { db } = recordingDb(sequence({ lesson: [{ assignmentId: "as-2", title: "Rain", dueDate: null, status: null }] }));
    const out = await getStudentHome({ db, user: student, now: NOW });
    expect(out.todayLesson).toEqual({ assignmentId: "as-2", title: "Rain", dueDate: null, started: false });
  });

  it("rejects a user who is not a student", async () => {
    const { db, queries } = recordingDb(sequence({}));
    await expect(getStudentHome({ db, user: { ...student, role: "TEACHER" }, now: NOW })).rejects.toThrow(/lacks permission/);
    expect(queries).toHaveLength(0);
  });
});
