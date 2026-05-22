import { describe, it, expect, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { submitScienceAttempt, getStudentScienceAttempts } from "../quiz/index.js";
import { createTenantDB } from "../db-contract.js";
import { createMockDb } from "./mock-db.js";

vi.mock("@reading-advantage/db/schema", () => ({
  scienceAttempts: { id: "id", studentId: "studentId", lessonId: "lessonId", attemptNumber: "attemptNumber" },
  scienceQuestionResponses: { attemptId: "attemptId", questionId: "questionId" },
  scienceLessons: { id: "id" },
  users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, type: "eq" })),
  and: vi.fn((...conds) => ({ type: "and", conds })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ type: "sql", strings, values })),
}));

const mockStudent = { id: "s1", role: "STUDENT" as const, schoolId: "school-1" };
const mockTeacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1" };
const mockTenant = { schoolId: "school-1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, mockTenant);
}

describe("submitScienceAttempt", () => {
  it("creates an attempt and returns it", async () => {
    const attempt = { id: "att-1", studentId: "s1", lessonId: "l1", score: 8, maxScore: 10, attemptNumber: 1 };
    const db = createMockDb({ insertReturning: [attempt] });

    const result = await submitScienceAttempt({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { lessonId: "l1", score: 8, maxScore: 10, attemptNumber: 1 },
    });

    expect(result.score).toBe(8);
    expect(result.lessonId).toBe("l1");
    expect(db.insert).toHaveBeenCalled();
  });

  it("throws when non-student tries to submit an attempt", async () => {
    const db = createMockDb();

    await expect(
      submitScienceAttempt({
        db: wrapDb(db),
        user: mockTeacher,
        tenant: mockTenant,
        input: { lessonId: "l1", score: 10, maxScore: 10, attemptNumber: 1 },
      })
    ).rejects.toThrow(/quiz:submit/);
  });
});

describe("getStudentScienceAttempts", () => {
  it("returns attempts for a student's lesson", async () => {
    const db = createMockDb({
      selectResults: [
        { id: "att-1", studentId: "s1", lessonId: "l1", score: 7, maxScore: 10, attemptNumber: 1 },
        { id: "att-2", studentId: "s1", lessonId: "l1", score: 9, maxScore: 10, attemptNumber: 2 },
      ],
    });

    const result = await getStudentScienceAttempts({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { studentId: "s1", lessonId: "l1" },
    });

    expect(result).toHaveLength(2);
    expect(result[1].score).toBe(9);
  });

  it("allows teacher to read any student's attempts", async () => {
    const db = createMockDb({ selectResults: [{ id: "att-1", studentId: "s2" }] });

    const result = await getStudentScienceAttempts({
      db: wrapDb(db),
      user: mockTeacher,
      tenant: mockTenant,
      input: { studentId: "s2", lessonId: "l1" },
    });

    expect(result).toHaveLength(1);
  });

  it("throws when student reads another student's attempts", async () => {
    const db = createMockDb();

    await expect(
      getStudentScienceAttempts({
        db: wrapDb(db),
        user: mockStudent,
        tenant: mockTenant,
        input: { studentId: "other-student", lessonId: "l1" },
      })
    ).rejects.toThrow(/quiz:read/);
  });

  it("returns empty list when no attempts exist", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await getStudentScienceAttempts({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { studentId: "s1", lessonId: "l1" },
    });

    expect(result).toEqual([]);
  });
});
