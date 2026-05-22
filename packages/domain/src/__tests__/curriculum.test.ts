import { describe, it, expect, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { getScienceLesson, listScienceLessons, createScienceLesson } from "../curriculum/index.js";
import { createTenantDB } from "../db-contract.js";
import { createMockDb } from "./mock-db.js";

vi.mock("@reading-advantage/db/schema", () => ({
  scienceLessons: { id: "id", slug: "slug", lessonType: "lessonType", gradeLevel: "gradeLevel" },
  users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, type: "eq" })),
  and: vi.fn((...conds) => ({ type: "and", conds })),
}));

const mockStudent = { id: "s1", role: "STUDENT" as const, schoolId: "school-1" };
const mockTeacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1" };
const mockTenant = { schoolId: "school-1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, mockTenant);
}

describe("getScienceLesson", () => {
  it("returns a lesson by ID", async () => {
    const lesson = { id: "l1", slug: "photosynthesis", title: "Photosynthesis", gradeLevel: 5 };
    const db = createMockDb({ selectResults: [lesson] });

    const result = await getScienceLesson({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { lessonId: "l1" },
    });

    expect(result).toEqual(lesson);
  });

  it("throws when lesson is not found", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(
      getScienceLesson({
        db: wrapDb(db),
        user: mockStudent,
        tenant: mockTenant,
        input: { lessonId: "nonexistent" },
      })
    ).rejects.toThrow(/Lesson not found/);
  });
});

describe("listScienceLessons", () => {
  it("returns all lessons for a grade level", async () => {
    const db = createMockDb({
      selectResults: [
        { id: "l1", title: "Lesson 1", gradeLevel: 5 },
        { id: "l2", title: "Lesson 2", gradeLevel: 5 },
      ],
    });

    const result = await listScienceLessons({
      db: wrapDb(db),
      user: mockTeacher,
      tenant: mockTenant,
      input: { gradeLevel: 5 },
    });

    expect(result).toHaveLength(2);
  });

  it("returns empty list when no lessons match", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await listScienceLessons({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { gradeLevel: 99 },
    });

    expect(result).toEqual([]);
  });
});

describe("createScienceLesson", () => {
  it("creates a lesson and returns it", async () => {
    const created = { id: "l3", slug: "cell-division", title: "Cell Division", gradeLevel: 6, order: 1 };
    const db = createMockDb({ insertReturning: [created] });

    const result = await createScienceLesson({
      db: wrapDb(db),
      user: mockTeacher,
      tenant: mockTenant,
      input: { slug: "cell-division", title: "Cell Division", gradeLevel: 6, order: 1, lessonType: "LESSON" },
    });

    expect(result.slug).toBe("cell-division");
  });

  it("throws when student tries to create a lesson", async () => {
    const db = createMockDb();

    await expect(
      createScienceLesson({
        db: wrapDb(db),
        user: mockStudent,
        tenant: mockTenant,
        input: { slug: "hack", title: "Hack Lesson", gradeLevel: 1, order: 1, lessonType: "LESSON" },
      })
    ).rejects.toThrow(/curriculum:create/);
  });
});
