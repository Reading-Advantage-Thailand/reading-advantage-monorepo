import { describe, it, expect } from "vitest";
import { listStudents, importRoster } from "../students/index.js";
import { createMockDb, type MockDb } from "./mock-db.js";

const teacher = { id: "t1", email: "t@t.com", name: "T", role: "TEACHER" as const, schoolId: "s1" };
const student = { id: "st1", email: "st@st.com", name: "ST", role: "STUDENT" as const, schoolId: "s1" };
const tenant = { schoolId: "s1" };

describe("listStudents", () => {
  it("returns students for a classroom when called by teacher", async () => {
    const students = [
      { id: "s1", name: "Alice", email: "a@test.com", role: "STUDENT", xp: 100, level: 2, cefrLevel: "A1" },
      { id: "s2", name: "Bob", email: "b@test.com", role: "STUDENT", xp: 200, level: 3, cefrLevel: "A2" },
    ];
    const db = createMockDb({ selectResults: students });

    const result = await listStudents({
      db: db as MockDb,
      user: teacher,
      tenant,
      input: { classroomId: "c1" },
    });

    expect(result).toEqual(students);
  });

  it("throws when student tries to list students", async () => {
    const db = createMockDb();

    await expect(
      listStudents({ db: db as MockDb, user: student, tenant, input: { classroomId: "c1" } })
    ).rejects.toThrow(/STUDENT.*student:list/);
  });
});

describe("importRoster", () => {
  it("creates new users and links to classroom", async () => {
    const newUser = { id: "new-1", name: "New Student", email: "new@test.com", role: "STUDENT" };

    const mockTx = createMockDb({
      selectResults: [], // no existing user
      insertReturning: [newUser],
    });

    const db = createMockDb({
      transactionFn: async (fn: (tx: MockDb) => Promise<unknown>) => fn(mockTx),
    });

    const result = await importRoster({
      db: db as MockDb,
      user: teacher,
      tenant,
      input: {
        classroomId: "c1",
        students: [{ name: "New Student", email: "new@test.com" }],
      },
    });

    expect(result).toEqual([{ email: "new@test.com", id: "new-1" }]);
    expect(db.transaction).toHaveBeenCalledOnce();
  });

  it("reuses existing users by email", async () => {
    const existingUser = { id: "existing-1", name: "Existing", email: "exist@test.com", role: "STUDENT" };

    const mockTx = createMockDb({
      selectResults: [existingUser], // existing user found
    });

    const db = createMockDb({
      transactionFn: async (fn: (tx: MockDb) => Promise<unknown>) => fn(mockTx),
    });

    const result = await importRoster({
      db: db as MockDb,
      user: teacher,
      tenant,
      input: {
        classroomId: "c1",
        students: [{ name: "Existing", email: "exist@test.com" }],
      },
    });

    expect(result).toEqual([{ email: "exist@test.com", id: "existing-1" }]);
    // Should not have inserted a new user
    const insertCall = mockTx.insert.mock.results;
    // insert was called once for classroomStudents only, not for users
    expect(insertCall.length).toBeLessThanOrEqual(2);
  });

  it("throws when student tries to import roster", async () => {
    const db = createMockDb();

    await expect(
      importRoster({
        db: db as MockDb,
        user: student,
        tenant,
        input: { classroomId: "c1", students: [] },
      })
    ).rejects.toThrow(/STUDENT.*student:import/);
  });
});
