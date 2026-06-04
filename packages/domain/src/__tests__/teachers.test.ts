import { describe, it, expect } from "vitest";
import { getTeacherClasses, getTeacherClassesWithCounts, TeacherNotFoundError } from "../teachers/index.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const teacher = { id: "t1", username: "teacher1", name: "T", role: "TEACHER" as const, schoolId: "s1" };
const admin = { id: "a1", username: "admin1", name: "A", role: "ADMIN" as const, schoolId: "s1" };
const student = { id: "st1", username: "student1", name: "ST", role: "STUDENT" as const, schoolId: "s1" };
const tenant = { schoolId: "s1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, tenant);
}

describe("getTeacherClasses", () => {
  it("returns classes for a teacher when called by TEACHER", async () => {
    const classes = [
      { id: "c1", name: "Science 101", gradeLevel: 5, joinCode: "ABC123", standardsAlignment: "THAI", createdAt: new Date("2025-01-01") },
      { id: "c2", name: "Science 102", gradeLevel: 6, joinCode: "DEF456", standardsAlignment: "NGSS", createdAt: new Date("2025-02-01") },
    ];
    const db = createMockDb({ selectResults: classes });

    const result = await getTeacherClasses({
      db: wrapDb(db),
      user: teacher,
      tenant,
      teacherId: "t1",
    });

    expect(result).toEqual(classes);
    expect(result).toHaveLength(2);
    expect(db.select).toHaveBeenCalledOnce();
  });

  it("returns classes when called by ADMIN", async () => {
    const classes = [
      { id: "c1", name: "Science 101", gradeLevel: 5, joinCode: "ABC123", standardsAlignment: "THAI", createdAt: new Date() },
    ];
    const db = createMockDb({ selectResults: classes });

    const result = await getTeacherClasses({
      db: wrapDb(db),
      user: admin,
      tenant,
      teacherId: "t1",
    });

    expect(result).toEqual(classes);
  });

  it("returns empty array when teacher has no classes", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await getTeacherClasses({
      db: wrapDb(db),
      user: teacher,
      tenant,
      teacherId: "t999",
    });

    expect(result).toEqual([]);
  });

  it("throws when STUDENT tries to read teacher classes", async () => {
    const db = createMockDb();

    await expect(
      getTeacherClasses({
        db: wrapDb(db),
        user: student,
        tenant,
        teacherId: "t1",
      })
    ).rejects.toThrow(/STUDENT.*teachers:read:own/);
  });
});

describe("getTeacherClassesWithCounts", () => {
  it("returns classes with student counts when called by TEACHER", async () => {
    const classes = [
      { id: "c1", name: "Science 101", gradeLevel: 5, joinCode: "ABC123", standardsAlignment: "THAI", createdAt: new Date("2025-01-01"), studentCount: 25 },
      { id: "c2", name: "Science 102", gradeLevel: 6, joinCode: "DEF456", standardsAlignment: "NGSS", createdAt: new Date("2025-02-01"), studentCount: 0 },
    ];
    const db = createMockDb({ selectResults: classes });

    const result = await getTeacherClassesWithCounts({
      db: wrapDb(db),
      user: teacher,
      tenant,
      teacherId: "t1",
    });

    expect(result).toEqual(classes);
    expect(result[0].studentCount).toBe(25);
    expect(result[1].studentCount).toBe(0);
    expect(db.select).toHaveBeenCalledOnce();
  });

  it("returns classes with counts when called by ADMIN", async () => {
    const classes = [
      { id: "c1", name: "Science 101", gradeLevel: 5, joinCode: "ABC123", standardsAlignment: "THAI", createdAt: new Date(), studentCount: 10 },
    ];
    const db = createMockDb({ selectResults: classes });

    const result = await getTeacherClassesWithCounts({
      db: wrapDb(db),
      user: admin,
      tenant,
      teacherId: "t1",
    });

    expect(result).toEqual(classes);
  });

  it("returns empty array when teacher has no classes", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await getTeacherClassesWithCounts({
      db: wrapDb(db),
      user: teacher,
      tenant,
      teacherId: "t999",
    });

    expect(result).toEqual([]);
  });

  it("throws when STUDENT tries to read teacher classes with counts", async () => {
    const db = createMockDb();

    await expect(
      getTeacherClassesWithCounts({
        db: wrapDb(db),
        user: student,
        tenant,
        teacherId: "t1",
      })
    ).rejects.toThrow(/STUDENT.*teachers:read:own/);
  });
});

describe("TeacherNotFoundError", () => {
  it("creates error with teacher id in message", () => {
    const err = new TeacherNotFoundError("t123");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("TeacherNotFoundError");
    expect(err.message).toBe("Teacher not found: t123");
  });
});
