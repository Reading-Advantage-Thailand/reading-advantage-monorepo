import { describe, expect, it, vi } from "vitest";
import { createAssignment } from "../assignments/index.js";
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
