import { describe, it, expect, vi } from "vitest";
import { listStudents, importRoster } from "../students/index.js";
import { createMockDb, type MockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const teacher = { id: "t1", username: "teacher1", name: "T", role: "TEACHER" as const, schoolId: "s1" };
const student = { id: "st1", username: "student1", name: "ST", role: "STUDENT" as const, schoolId: "s1" };
const tenant = { schoolId: "s1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, tenant);
}

function mockClassroomSelect(db: MockDb, schoolId: string, teacherId?: string) {
  const row = { schoolId, teacherId: teacherId ?? "t1" };
  const classroomWhere = vi.fn().mockReturnValue(
    Object.assign(Promise.resolve([row]), {
      limit: vi.fn().mockResolvedValue([row]),
    })
  ) as ReturnType<typeof vi.fn> & { limit: ReturnType<typeof vi.fn> };
  classroomWhere.limit = vi.fn().mockResolvedValue([row]);

  const originalSelect = db.select;
  db.select = vi.fn().mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: classroomWhere,
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(
          Object.assign(Promise.resolve([]), { limit: vi.fn().mockResolvedValue([]) })
        ),
      }),
    }),
  }).mockImplementation(() => originalSelect());
}

describe("listStudents", () => {
  it("returns students for a classroom when called by teacher", async () => {
    const students = [
      { id: "s1", name: "Alice", username: "a@test.com", role: "STUDENT", xp: 100, level: 2, cefrLevel: "A1" },
      { id: "s2", name: "Bob", username: "b@test.com", role: "STUDENT", xp: 200, level: 3, cefrLevel: "A2" },
    ];
    const db = createMockDb({ selectResults: students });
    mockClassroomSelect(db, "s1");

    const result = await listStudents({
      db: wrapDb(db),
      user: teacher,
      tenant,
      input: { classroomId: "c1" },
    });

    expect(result).toEqual(students);
  });

  it("throws when student tries to list students", async () => {
    const db = createMockDb();

    await expect(
      listStudents({ db: wrapDb(db), user: student, tenant, input: { classroomId: "c1" } })
    ).rejects.toThrow(/STUDENT.*student:list/);
  });

  it("throws when classroom belongs to a different school", async () => {
    const db = createMockDb();
    mockClassroomSelect(db, "s2");

    await expect(
      listStudents({ db: wrapDb(db), user: teacher, tenant, input: { classroomId: "c1" } })
    ).rejects.toThrow(/Classroom not found/);
  });

  it("throws when classroom does not exist", async () => {
    const db = createMockDb();
    mockClassroomSelect(db, "s1");
    // Override the first select to return empty for classroom lookup
    const emptyWhere = vi.fn().mockReturnValue(
      Object.assign(Promise.resolve([]), { limit: vi.fn().mockResolvedValue([]) })
    );
    db.select = vi.fn().mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: emptyWhere,
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(
            Object.assign(Promise.resolve([]), { limit: vi.fn().mockResolvedValue([]) })
          ),
        }),
      }),
    });

    await expect(
      listStudents({ db: wrapDb(db), user: teacher, tenant, input: { classroomId: "c1" } })
    ).rejects.toThrow(/Classroom not found/);
  });
});

describe("importRoster", () => {
  it("creates new users and links to classroom", async () => {
    const newUser = { id: "new-1", name: "New Student", username: "new@test.com", role: "STUDENT" };

    const mockTx = createMockDb({
      selectResults: [], // no existing user
      insertReturning: [newUser],
    });

    const db = createMockDb({
      transactionFn: async (fn: unknown) => {
        const castFn = fn as (tx: MockDb) => Promise<unknown>;
        return castFn(mockTx);
      },
    });
    mockClassroomSelect(db, "s1");

    const result = await importRoster({
      db: wrapDb(db),
      user: teacher,
      tenant,
      input: {
        classroomId: "c1",
        students: [{ name: "New Student", username: "new@test.com" }],
      },
    });

    expect(result).toEqual([{ username: "new@test.com", id: "new-1" }]);
    expect(db.transaction).toHaveBeenCalledOnce();
  });

  it("reuses existing users by email", async () => {
    const existingUser = { id: "existing-1", name: "Existing", username: "exist@test.com", role: "STUDENT" };

    const mockTx = createMockDb({
      selectResults: [existingUser], // existing user found
    });

    const db = createMockDb({
      transactionFn: async (fn: unknown) => {
        const castFn = fn as (tx: MockDb) => Promise<unknown>;
        return castFn(mockTx);
      },
    });
    mockClassroomSelect(db, "s1");

    const result = await importRoster({
      db: wrapDb(db),
      user: teacher,
      tenant,
      input: {
        classroomId: "c1",
        students: [{ name: "Existing", username: "exist@test.com" }],
      },
    });

    expect(result).toEqual([{ username: "exist@test.com", id: "existing-1" }]);
    const insertCall = mockTx.insert.mock.results;
    expect(insertCall.length).toBe(1);
  });

  it("throws when student tries to import roster", async () => {
    const db = createMockDb();

    await expect(
      importRoster({
        db: wrapDb(db),
        user: student,
        tenant,
        input: { classroomId: "c1", students: [] },
      })
    ).rejects.toThrow(/STUDENT.*student:import/);
  });

  it("throws when classroom belongs to a different school", async () => {
    const db = createMockDb();
    mockClassroomSelect(db, "s2");

    await expect(
      importRoster({
        db: wrapDb(db),
        user: teacher,
        tenant,
        input: { classroomId: "c1", students: [{ name: "Test", username: "test@test.com" }] },
      })
    ).rejects.toThrow(/Classroom not found/);
  });

  it("throws when teacher tries to import into another teacher's classroom", async () => {
    const db = createMockDb();
    mockClassroomSelect(db, "s1", "other-teacher");

    await expect(
      importRoster({
        db: wrapDb(db),
        user: teacher,
        tenant,
        input: { classroomId: "c1", students: [{ name: "Test", username: "test@test.com" }] },
      })
    ).rejects.toThrow(/You do not own this classroom/);
  });

  it("allows admin to import into any classroom in their school", async () => {
    const newUser = { id: "new-1", name: "New Student", username: "new@test.com", role: "STUDENT" };

    const mockTx = createMockDb({
      selectResults: [],
      insertReturning: [newUser],
    });

    const db = createMockDb({
      transactionFn: async (fn: unknown) => {
        const castFn = fn as (tx: MockDb) => Promise<unknown>;
        return castFn(mockTx);
      },
    });
    mockClassroomSelect(db, "s1", "other-teacher");

    const adminUser = { id: "a1", username: "admin1", name: "A", role: "ADMIN" as const, schoolId: "s1" };

    const result = await importRoster({
      db: wrapDb(db),
      user: adminUser,
      tenant,
      input: {
        classroomId: "c1",
        students: [{ name: "New Student", username: "new@test.com" }],
      },
    });

    expect(result).toEqual([{ username: "new@test.com", id: "new-1" }]);
  });
});
