import { describe, it, expect, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { getStudentProgress } from "../progress/index.js";
import { createTenantDB } from "../db-contract.js";

vi.mock("@reading-advantage/db/schema", () => ({
  userActivity: { userId: "userId" },
  userWordRecords: { userId: "userId" },
  userSentenceRecords: { userId: "userId" },
  lessonProgress: { userId: "userId", lessonId: "lessonId" },
  classroomStudents: { classroomId: "classroomId", studentId: "studentId" },
  classrooms: { id: "id", schoolId: "schoolId" },
  xpLogs: { userId: "userId", xpEarned: "xpEarned" },
  storyRecords: { userId: "userId", status: "status" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, type: "eq" })),
  and: vi.fn((...conds) => conds),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: "sql",
    strings,
    values,
  })),
}));

function createMockDb() {
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  };
  return mockDb;
}

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, mockTenant);
}

const mockUser = {
  id: "teacher-1",
  username: "teacher1",
  name: "Teacher",
  role: "TEACHER" as const,
  schoolId: "school-1",
};

const mockTenant = { schoolId: "school-1" };

describe("getStudentProgress", () => {
  it("returns student progress with xpTotal and storiesCompleted", async () => {
    const db = createMockDb();
    db.select
      // enrollment check
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ classroomId: "c1" }]),
            }),
          }),
        }),
      })
      // activities
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ activityType: "read", xpEarned: 50 }]),
        }),
      })
      // wordRecords
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ word: "hello" }]),
        }),
      })
      // sentenceRecords
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ sentence: "Hello world" }]),
        }),
      })
      // xpTotal
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 250 }]),
        }),
      })
      // storiesCompleted
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 12 }]),
        }),
      });

    const result = await getStudentProgress({
      db: wrapDb(db),
      user: mockUser,
      tenant: mockTenant,
      input: { studentId: "student-1" },
    });

    expect(result.studentId).toBe("student-1");
    expect(result.activities).toEqual([{ activityType: "read", xpEarned: 50 }]);
    expect(result.wordRecords).toEqual([{ word: "hello" }]);
    expect(result.sentenceRecords).toEqual([{ sentence: "Hello world" }]);
    expect(result.xpTotal).toBe(250);
    expect(result.storiesCompleted).toBe(12);
  });

  it("returns xpTotal 0 when xpLogs has no rows", async () => {
    const db = createMockDb();
    db.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ classroomId: "c1" }]),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

    const result = await getStudentProgress({
      db: wrapDb(db),
      user: mockUser,
      tenant: mockTenant,
      input: { studentId: "student-1" },
    });

    expect(result.xpTotal).toBe(0);
    expect(result.storiesCompleted).toBe(0);
  });

  it("returns 0 storiesCompleted when completed column is false for all records", async () => {
    const db = createMockDb();
    db.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ classroomId: "c1" }]),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 100 }]),
        }),
      })
      // stories completed = 0
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

    const result = await getStudentProgress({
      db: wrapDb(db),
      user: mockUser,
      tenant: mockTenant,
      input: { studentId: "student-1" },
    });

    expect(result.xpTotal).toBe(100);
    expect(result.storiesCompleted).toBe(0);
  });

  it("throws when student is not enrolled in caller's school", async () => {
    const db = createMockDb();
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    await expect(
      getStudentProgress({
        db: wrapDb(db),
        user: mockUser,
        tenant: mockTenant,
        input: { studentId: "student-other-school" },
      })
    ).rejects.toThrow(/Student not found in your school/);
  });

  it("throws when user lacks progress:read:all permission", async () => {
    const db = createMockDb();
    const student = {
      id: "student-1",
      username: "student1",
      name: "Student",
      role: "STUDENT" as const,
      schoolId: "school-1",
    };

    await expect(
      getStudentProgress({
        db: wrapDb(db),
        user: student,
        tenant: mockTenant,
        input: { studentId: "student-1" },
      })
    ).rejects.toThrow(/progress:read:all/);
  });
});
