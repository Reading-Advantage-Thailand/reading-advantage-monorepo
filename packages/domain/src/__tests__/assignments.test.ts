import { describe, expect, it, vi } from "vitest";
import {
  createAssignment,
  listAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
} from "../assignments/index.js";
import { createMockDb, type MockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const teacher = {
  id: "t1",
  username: "teacher1",
  name: "Teacher",
  role: "TEACHER" as const,
  schoolId: "s1",
};
const student = {
  id: "st1",
  username: "student1",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "s1",
};
const tenant = { schoolId: "s1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, tenant);
}

function queryResult<T>(value: T) {
  return Object.assign(Promise.resolve(value), {
    limit: vi.fn().mockResolvedValue(value),
  });
}

function createAssignmentDb({
  classroomSchoolId = "s1",
  validStudentIds = ["st1", "st2"],
}: {
  classroomSchoolId?: string;
  validStudentIds?: string[];
} = {}) {
  const tx = createMockDb({
    insertReturning: [{ id: "a1", title: "Assignment" }],
  });

  tx.select = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(
          queryResult(validStudentIds.map((studentId) => ({ studentId })))
        ),
      }),
      where: vi.fn().mockReturnValue(queryResult([])),
    }),
  });

  const db = createMockDb({
    selectResults: [{ schoolId: classroomSchoolId }],
    transactionFn: async (fn: unknown) => {
      const run = fn as (tx: MockDb) => Promise<unknown>;
      return run(tx);
    },
  });

  return { db, tx };
}

function mockClassroomSelect(db: ReturnType<typeof createMockDb>, schoolId: string) {
  db.select = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(
        queryResult([{ schoolId }])
      ),
    }),
  });
}

describe("createAssignment", () => {
  it("rejects student IDs that are not enrolled in the classroom", async () => {
    const { db, tx } = createAssignmentDb({ validStudentIds: ["st1"] });

    await expect(
      createAssignment({
        db: wrapDb(db),
        user: teacher,
        tenant,
        input: {
          title: "Assignment",
          classroomId: "c1",
          type: "article",
          studentIds: ["st1", "st-other"],
        },
      })
    ).rejects.toThrow(/outside the classroom/);

    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("creates assignment rows for valid classroom students", async () => {
    const { db, tx } = createAssignmentDb({ validStudentIds: ["st1", "st2"] });

    const result = await createAssignment({
      db: wrapDb(db),
      user: teacher,
      tenant,
      input: {
        title: "Assignment",
        classroomId: "c1",
        type: "article",
        studentIds: ["st1", "st2"],
      },
    });

    expect(result).toEqual({ id: "a1", title: "Assignment" });
    expect(tx.insert).toHaveBeenCalledTimes(2);
  });
});

describe("listAssignments", () => {
  it("returns assignments for a classroom", async () => {
    const assignmentRows = [{ id: "a1", title: "HW1" }];
    const db = createMockDb({ selectResults: assignmentRows });

    // First select: classroom lookup; second: assignments list
    const originalSelect = db.select;
    db.select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult([{ schoolId: "s1" }])),
        }),
      })
      .mockImplementation(() => originalSelect());

    const result = await listAssignments({
      db: wrapDb(db),
      user: teacher,
      tenant,
      input: { classroomId: "c1" },
    });

    expect(result).toEqual(assignmentRows);
  });

  it("throws when classroom belongs to a different school", async () => {
    const db = createMockDb();
    mockClassroomSelect(db, "s2");

    await expect(
      listAssignments({
        db: wrapDb(db),
        user: teacher,
        tenant,
        input: { classroomId: "c1" },
      })
    ).rejects.toThrow(/Classroom not found/);
  });
});

describe("getAssignment", () => {
  it("returns assignment by id", async () => {
    const assignmentRow = { id: "a1", title: "HW1", classroomId: "c1" };
    const db = createMockDb({ selectResults: [assignmentRow] });

    const originalSelect = db.select;
    db.select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult([assignmentRow])),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult([{ schoolId: "s1" }])),
        }),
      })
      .mockImplementation(() => originalSelect());

    const result = await getAssignment({
      db: wrapDb(db),
      user: teacher,
      tenant,
      input: { id: "a1" },
    });

    expect(result.id).toBe("a1");
  });

  it("throws when assignment not found", async () => {
    const db = createMockDb();

    const originalSelect = db.select;
    db.select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult([])),
        }),
      })
      .mockImplementation(() => originalSelect());

    await expect(
      getAssignment({
        db: wrapDb(db),
        user: teacher,
        tenant,
        input: { id: "missing" },
      })
    ).rejects.toThrow(/Assignment not found/);
  });
});

describe("updateAssignment", () => {
  it("updates allowed fields", async () => {
    const assignmentRow = { id: "a1", title: "HW1", classroomId: "c1" };
    const updatedRow = { id: "a1", title: "Updated HW" };

    const db = createMockDb({ selectResults: [assignmentRow], updateReturning: [updatedRow] });

    const originalSelect = db.select;
    db.select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult([assignmentRow])),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult([{ schoolId: "s1" }])),
        }),
      })
      .mockImplementation(() => originalSelect());

    const result = await updateAssignment({
      db: wrapDb(db),
      user: teacher,
      tenant,
      input: { id: "a1", title: "Updated HW" },
    });

    expect(result.title).toBe("Updated HW");
  });

  it("throws when assignment belongs to a different tenant", async () => {
    const db = createMockDb();
    mockClassroomSelect(db, "s2");

    await expect(
      updateAssignment({
        db: wrapDb(db),
        user: teacher,
        tenant,
        input: { id: "a1", title: "Updated" },
      })
    ).rejects.toThrow(/Assignment not found/);
  });
});

describe("deleteAssignment", () => {
  it("deletes assignment", async () => {
    const assignmentRow = { id: "a1", title: "HW1", classroomId: "c1" };
    const db = createMockDb({ selectResults: [assignmentRow] });

    const originalSelect = db.select;
    db.select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult([assignmentRow])),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult([{ schoolId: "s1" }])),
        }),
      })
      .mockImplementation(() => originalSelect());

    const result = await deleteAssignment({
      db: wrapDb(db),
      user: teacher,
      tenant,
      input: { id: "a1" },
    });

    expect(result.success).toBe(true);
  });

  it("throws when assignment belongs to a different tenant", async () => {
    const db = createMockDb();
    mockClassroomSelect(db, "s2");

    await expect(
      deleteAssignment({
        db: wrapDb(db),
        user: teacher,
        tenant,
        input: { id: "a1" },
      })
    ).rejects.toThrow(/Assignment not found/);
  });
});

describe("submitAssignment", () => {
  it("updates score for enrolled student", async () => {
    const db = createMockDb({
      selectResults: [{ classroomId: "c1" }],
      updateReturning: [{ id: "sa1", completed: true, score: 85 }],
    });

    const originalSelect = db.select;
    db.select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult([{ classroomId: "c1" }])),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult([{ schoolId: "s1" }])),
        }),
      })
      .mockImplementation(() => originalSelect());

    const result = await submitAssignment({
      db: wrapDb(db),
      user: student,
      tenant,
      input: { assignmentId: "a1", score: 85 },
    });

    expect(result.score).toBe(85);
    expect(result.completed).toBe(true);
  });

  it("throws when assignment belongs to a different tenant", async () => {
    const db = createMockDb();
    mockClassroomSelect(db, "s2");

    await expect(
      submitAssignment({
        db: wrapDb(db),
        user: student,
        tenant,
        input: { assignmentId: "a1", score: 85 },
      })
    ).rejects.toThrow(/Assignment not found/);
  });
});
