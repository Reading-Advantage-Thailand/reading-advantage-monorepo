import { describe, it, expect, vi, afterEach } from "vitest";
import { createMockDb } from "./mock-db.js";
import { joinClass, AlreadyEnrolledError } from "../classes/join-class.js";
import { deleteAssignment } from "../classes/delete-assignment.js";
import { archiveClass } from "../classes/archive-class.js";
import { updateClass } from "../classes/update-class.js";
import { createAssignment } from "../classes/create-assignment.js";
import { getClassRoster, removeStudentFromClass } from "../classes/get-class-roster.js";
import { createScienceClass } from "../classes/create-science-class.js";

let classesMockDb = createMockDb();

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  return {
    ...actual,
    get db() {
      return classesMockDb;
    },
  };
});

const tenant = { schoolId: "school-1" };
const teacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1" };
const otherTeacher = { id: "t2", role: "TEACHER" as const, schoolId: "school-1" };
const admin = { id: "a1", role: "ADMIN" as const, schoolId: "school-1" };
const student = { id: "s1", role: "STUDENT" as const, schoolId: "school-1" };
const ownedClass = [{ teacherId: "t1" }];
const at = new Date("2026-03-01T00:00:00.000Z");

/** A thenable that rejects; a real Promise breaks inside a mock transaction chain. */
function rejecting(error: unknown) {
  return { then: (_ok: unknown, fail: (e: unknown) => unknown) => fail(error) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("joinClass", () => {
  const classRow = { id: "c1", schoolId: "school-2", name: "Bio", gradeLevel: 7, teacherName: null };

  it("throws for a teacher", async () => {
    classesMockDb = createMockDb();
    await expect(joinClass({ user: teacher, tenant, input: { joinCode: "ABC123" } })).rejects.toThrow();
  });

  it("throws when the join code is unknown", async () => {
    classesMockDb = createMockDb({ selectSequence: [[]] });
    await expect(joinClass({ user: student, tenant, input: { joinCode: "NOPE00" } })).rejects.toThrow("Join code not found");
  });

  it("enrolls the student with the class school id", async () => {
    classesMockDb = createMockDb({ selectSequence: [[classRow], []] });
    const res = await joinClass({ user: student, tenant, input: { joinCode: "ABC123" } });
    expect(res).toEqual({
      success: true,
      classEnrollment: { id: "c1:s1", classId: "c1", className: "Bio", gradeLevel: 7, teacherName: "Teacher" },
    });
    expect(classesMockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith({ schoolId: "school-2", classId: "c1", studentId: "s1" });
  });

  it("throws AlreadyEnrolledError when an enrollment exists", async () => {
    classesMockDb = createMockDb({ selectSequence: [[classRow], [{ classId: "c1" }]] });
    await expect(joinClass({ user: student, tenant, input: { joinCode: "ABC123" } })).rejects.toBeInstanceOf(AlreadyEnrolledError);
    expect(classesMockDb.insert).not.toHaveBeenCalled();
  });

  it("maps a unique violation on insert to AlreadyEnrolledError", async () => {
    classesMockDb = createMockDb({ selectSequence: [[classRow], []] });
    classesMockDb.insert.mockReturnValueOnce({ values: vi.fn(() => rejecting({ cause: { code: "23505" } })) });
    const err = await joinClass({ user: student, tenant, input: { joinCode: "ABC123" } }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AlreadyEnrolledError);
    expect((err as Error).message).toBe("ALREADY_ENROLLED");
  });

  it("maps a direct unique violation code too", async () => {
    classesMockDb = createMockDb({ selectSequence: [[classRow], []] });
    classesMockDb.insert.mockReturnValueOnce({ values: vi.fn(() => rejecting({ code: "23505" })) });
    await expect(joinClass({ user: student, tenant, input: { joinCode: "ABC123" } })).rejects.toBeInstanceOf(AlreadyEnrolledError);
  });

  it("rethrows other insert errors", async () => {
    classesMockDb = createMockDb({ selectSequence: [[classRow], []] });
    classesMockDb.insert.mockReturnValueOnce({ values: vi.fn(() => rejecting(new Error("down"))) });
    await expect(joinClass({ user: student, tenant, input: { joinCode: "ABC123" } })).rejects.toThrow("down");
  });
});

describe("deleteAssignment", () => {
  const input = { classId: "c1", assignmentId: "as1" };

  it("throws for a student", async () => {
    classesMockDb = createMockDb();
    await expect(deleteAssignment({ user: student, tenant, input })).rejects.toThrow();
  });

  it("returns 404 when the class is missing", async () => {
    classesMockDb = createMockDb({ selectSequence: [[]] });
    expect(await deleteAssignment({ user: teacher, tenant, input })).toEqual({ error: "Class not found", status: 404 });
  });

  it("returns 403 for a teacher who does not own the class", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    expect(await deleteAssignment({ user: otherTeacher, tenant, input })).toEqual({ error: "Forbidden", status: 403 });
    expect(classesMockDb.delete).not.toHaveBeenCalled();
  });

  it("returns 404 when the assignment is not in the class", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass, []] });
    expect(await deleteAssignment({ user: teacher, tenant, input })).toEqual({ error: "Assignment not found", status: 404 });
    expect(classesMockDb.delete).not.toHaveBeenCalled();
  });

  it("deletes for the owner", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass, [{ id: "as1" }]] });
    expect(await deleteAssignment({ user: teacher, tenant, input })).toEqual({ success: true, data: { deleted: true } });
    expect(classesMockDb.delete).toHaveBeenCalledTimes(1);
  });

  it("deletes for an admin who does not own the class", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass, [{ id: "as1" }]] });
    expect(await deleteAssignment({ user: admin, tenant, input })).toMatchObject({ success: true });
  });
});

describe("archiveClass", () => {
  it("throws when the class is missing", async () => {
    classesMockDb = createMockDb({ selectSequence: [[]] });
    await expect(archiveClass({ user: teacher, tenant, input: { classId: "c1" } })).rejects.toThrow("Class not found");
  });

  it("throws Forbidden for a teacher who does not own the class", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    await expect(archiveClass({ user: otherTeacher, tenant, input: { classId: "c1" } })).rejects.toThrow("Forbidden");
    expect(classesMockDb.delete).not.toHaveBeenCalled();
  });

  it("deletes the class for the owner and for an admin", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    expect(await archiveClass({ user: teacher, tenant, input: { classId: "c1" } })).toEqual({ success: true, data: { deleted: true } });
    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    expect(await archiveClass({ user: admin, tenant, input: { classId: "c1" } })).toMatchObject({ success: true });
    expect(classesMockDb.delete).toHaveBeenCalledTimes(1);
  });

  it("throws for a student", async () => {
    classesMockDb = createMockDb();
    await expect(archiveClass({ user: student, tenant, input: { classId: "c1" } })).rejects.toThrow();
  });
});

describe("updateClass", () => {
  it("throws when the class is missing", async () => {
    classesMockDb = createMockDb({ selectSequence: [[]] });
    await expect(updateClass({ user: teacher, tenant, input: { classId: "c1", name: "Physics" } })).rejects.toThrow("Class not found");
  });

  it("throws Forbidden for a non-owner teacher", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    await expect(updateClass({ user: otherTeacher, tenant, input: { classId: "c1", name: "Physics" } })).rejects.toThrow("Forbidden");
  });

  it.each(["ab", "  ab  ", "x".repeat(101)])("rejects the name %j", async (name) => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    await expect(updateClass({ user: teacher, tenant, input: { classId: "c1", name } })).rejects.toThrow("Name must be between 3 and 100 characters");
    expect(classesMockDb.update).not.toHaveBeenCalled();
  });

  it("rejects an update with no fields", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    await expect(updateClass({ user: teacher, tenant, input: { classId: "c1" } })).rejects.toThrow("No valid fields to update");
  });

  it("trims and saves the name", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass], updateReturning: [{ id: "c1", name: "Physics", updatedAt: at }] });
    const res = await updateClass({ user: teacher, tenant, input: { classId: "c1", name: "  Physics  " } });
    expect(res).toEqual({ success: true, data: { id: "c1", name: "Physics", updatedAt: at.toISOString() } });
    expect(classesMockDb.update.mock.results[0].value.set).toHaveBeenCalledWith({ name: "Physics" });
  });
});

describe("createAssignment", () => {
  const input = { classId: "c1", lessonId: "l1" };
  const assignment = { id: "as1", classId: "c1", lessonId: "l1", assignedBy: "t1", assignedAt: at, dueAt: null, createdAt: at };

  it("throws for a student", async () => {
    classesMockDb = createMockDb();
    await expect(createAssignment({ user: student, tenant, input })).rejects.toThrow();
  });

  it("returns 404 when the class is missing", async () => {
    classesMockDb = createMockDb({ selectSequence: [[]] });
    expect(await createAssignment({ user: teacher, tenant, input })).toEqual({ error: "Class not found", status: 404 });
  });

  it("returns 403 for a non-owner teacher", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    expect(await createAssignment({ user: otherTeacher, tenant, input })).toEqual({ error: "Forbidden", status: 403 });
  });

  it("returns 404 when the lesson is missing", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass, []] });
    expect(await createAssignment({ user: teacher, tenant, input })).toEqual({ error: "Lesson not found", status: 404 });
  });

  it("returns 400 for an invalid due date", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass, [{ id: "l1" }]] });
    expect(await createAssignment({ user: teacher, tenant, input: { ...input, dueAt: "not-a-date" } })).toEqual({ error: "Invalid dueAt date", status: 400 });
    expect(classesMockDb.insert).not.toHaveBeenCalled();
  });

  it("creates the assignment with a due date", async () => {
    const dueAt = "2026-04-01T00:00:00.000Z";
    const teacherRow = { id: "t1", name: "Tea" };
    const lessonRow = { id: "l1", title: "Cells", slug: "cells", order: 1 };
    classesMockDb = createMockDb({
      selectSequence: [ownedClass, [{ id: "l1" }], [teacherRow], [lessonRow]],
      insertReturning: [{ ...assignment, dueAt: new Date(dueAt) }],
    });
    const res = await createAssignment({ user: teacher, tenant, input: { ...input, dueAt } });
    expect(res).toEqual({
      success: true,
      data: {
        id: "as1", classId: "c1", lessonId: "l1", assignedAt: at.toISOString(), dueAt, assignedBy: "t1",
        teacher: teacherRow, lesson: lessonRow, createdAt: at.toISOString(),
      },
    });
    const values = classesMockDb.insert.mock.results[0].value.values.mock.calls[0][0];
    expect(values).toMatchObject({ schoolId: "school-1", classId: "c1", lessonId: "l1", assignedBy: "t1" });
    expect(values.dueAt).toEqual(new Date(dueAt));
  });

  it("stores a null due date when none is given", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass, [{ id: "l1" }], [], []], insertReturning: [assignment] });
    const res = await createAssignment({ user: admin, tenant, input });
    expect(res).toMatchObject({ success: true, data: { dueAt: null } });
    expect(classesMockDb.insert.mock.results[0].value.values.mock.calls[0][0].dueAt).toBeNull();
  });
});

describe("getClassRoster and removeStudentFromClass", () => {
  it("throws when the class is missing or not owned", async () => {
    classesMockDb = createMockDb({ selectSequence: [[]] });
    await expect(getClassRoster({ user: teacher, tenant, input: { classId: "c1" } })).rejects.toThrow("Class not found");
    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    await expect(getClassRoster({ user: otherTeacher, tenant, input: { classId: "c1" } })).rejects.toThrow("Forbidden");
  });

  it("returns an empty roster without a user lookup", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass, []] });
    const res = await getClassRoster({ user: teacher, tenant, input: { classId: "c1" } });
    expect(res).toEqual({ success: true, data: { students: [] } });
    expect(classesMockDb.select).toHaveBeenCalledTimes(2);
  });

  it("maps student rows with ISO dates", async () => {
    classesMockDb = createMockDb({
      selectSequence: [ownedClass, [{ studentId: "s1" }, { studentId: "s2" }], [
        { id: "s1", name: "Ann", email: "a@x", createdAt: at, lastActiveAt: at },
        { id: "s2", name: "Bo", email: "b@x", createdAt: at, lastActiveAt: null },
      ]],
    });
    const res = await getClassRoster({ user: admin, tenant, input: { classId: "c1" } });
    expect(res.data.students).toEqual([
      { id: "s1", name: "Ann", email: "a@x", joinedAt: at.toISOString(), lastActiveAt: at.toISOString() },
      { id: "s2", name: "Bo", email: "b@x", joinedAt: at.toISOString(), lastActiveAt: null },
    ]);
  });

  it("removes a student only for the owner or an admin", async () => {
    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    await expect(removeStudentFromClass({ user: otherTeacher, tenant, input: { classId: "c1", studentId: "s1" } })).rejects.toThrow("Forbidden");
    expect(classesMockDb.delete).not.toHaveBeenCalled();

    classesMockDb = createMockDb({ selectSequence: [[]] });
    await expect(removeStudentFromClass({ user: teacher, tenant, input: { classId: "c1", studentId: "s1" } })).rejects.toThrow("Class not found");

    classesMockDb = createMockDb({ selectSequence: [ownedClass] });
    expect(await removeStudentFromClass({ user: teacher, tenant, input: { classId: "c1", studentId: "s1" } })).toEqual({ success: true, data: { removed: true } });
    expect(classesMockDb.delete).toHaveBeenCalledTimes(1);
  });

  it("throws for a student", async () => {
    classesMockDb = createMockDb();
    await expect(removeStudentFromClass({ user: student, tenant, input: { classId: "c1", studentId: "s1" } })).rejects.toThrow();
  });
});

describe("createScienceClass", () => {
  const input = { name: "Bio 7", gradeLevel: 7, standardsAlignment: "NGSS" };
  const newClass = { id: "class-0000-12345678", name: "Bio 7", gradeLevel: 7, standardsAlignment: "NGSS", joinCode: "ABC234", createdAt: at };

  it("throws for a student", async () => {
    classesMockDb = createMockDb();
    await expect(createScienceClass({ user: student, tenant, input })).rejects.toThrow();
  });

  it("creates a class without a unit when no template lessons match", async () => {
    classesMockDb = createMockDb({ selectSequence: [[], []], insertReturning: [newClass] });
    const res = await createScienceClass({ user: teacher, tenant, input });
    expect(res).toEqual({
      success: true,
      data: { id: newClass.id, name: "Bio 7", gradeLevel: 7, standardsAlignment: "NGSS", joinCode: "ABC234", studentCount: 0, createdAt: at },
    });
    const values = classesMockDb.insert.mock.results[0].value.values;
    expect(values).toHaveBeenCalledTimes(1);
    const classValues = values.mock.calls[0][0];
    expect(classValues).toMatchObject({ schoolId: "school-1", teacherId: "t1", name: "Bio 7" });
    expect(classValues.joinCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it("retries a taken join code and seeds a unit from template lessons", async () => {
    classesMockDb = createMockDb({
      selectSequence: [[{ id: "taken" }], [], [{ id: "l1" }, { id: "l2" }]],
      insertReturning: [newClass],
    });
    await createScienceClass({ user: teacher, tenant, input });
    const values = classesMockDb.insert.mock.results[0].value.values;
    expect(values).toHaveBeenCalledTimes(3);
    expect(values.mock.calls[1][0]).toMatchObject({ slug: "unit-1-intro-science-12345678", framework: "NGSS", gradeLevel: 7, classId: newClass.id });
    expect(values.mock.calls[2][0]).toEqual([
      { schoolId: "school-1", unitId: newClass.id, lessonId: "l1" },
      { schoolId: "school-1", unitId: newClass.id, lessonId: "l2" },
    ]);
  });

  it("throws after five taken join codes", async () => {
    classesMockDb = createMockDb({ selectResults: [{ id: "taken" }] });
    await expect(createScienceClass({ user: teacher, tenant, input })).rejects.toThrow("Failed to generate unique join code after 5 attempts");
    expect(classesMockDb.insert).not.toHaveBeenCalled();
  });
});
