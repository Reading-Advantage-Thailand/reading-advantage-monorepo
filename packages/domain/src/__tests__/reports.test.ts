import { describe, it, expect, vi } from "vitest";
import { getStudentProgress, getClassAnalytics } from "../reports/index.js";

vi.mock("@reading-advantage/db/schema", () => ({
  userActivity: { userId: "userId" },
  userWordRecords: { userId: "userId" },
  userSentenceRecords: { userId: "userId" },
  classroomStudents: { classroomId: "classroomId", studentId: "studentId" },
  xpLogs: { userId: "userId", amount: "amount" },
  storyRecords: { userId: "userId", completed: "completed" },
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

const mockUser = {
  id: "teacher-1",
  email: "teacher@test.com",
  name: "Teacher",
  role: "TEACHER" as const,
  schoolId: "school-1",
};

const mockTenant = { schoolId: "school-1" };

describe("getStudentProgress", () => {
  it("returns student progress data", async () => {
    const db = createMockDb();
    db.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ activityType: "read", xpEarned: 10 }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ word: "hello" }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ sentence: "Hello world" }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 100 }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

    const result = await getStudentProgress({
      db: db as MockDb,
      user: mockUser,
      tenant: mockTenant,
      input: { studentId: "student-1" },
    });

    expect(result.studentId).toBe("student-1");
    expect(result.xpTotal).toBe(100);
    expect(result.storiesCompleted).toBe(5);
  });

  it("handles empty progress data", async () => {
    const db = createMockDb();
    db.select
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
      db: db as MockDb,
      user: mockUser,
      tenant: mockTenant,
      input: { studentId: "student-1" },
    });

    expect(result.xpTotal).toBe(0);
    expect(result.storiesCompleted).toBe(0);
  });
});

describe("getClassAnalytics", () => {
  it("returns empty data for class with no students", async () => {
    const db = createMockDb();
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await getClassAnalytics({
      db: db as MockDb,
      user: mockUser,
      tenant: mockTenant,
      input: { classId: "class-1" },
    });

    expect(result.studentCount).toBe(0);
    expect(result.students).toEqual([]);
  });

  it("returns analytics for class with students", async () => {
    // Use a counter-based mock to handle parallel calls
    let callIndex = 0;
    const mockValues = [
      // First call: get students in class
      [{ studentId: "s1" }, { studentId: "s2" }],
      // For each student (in parallel): XP then stories
      [{ total: 50 }],  // s1 XP
      [{ count: 2 }],   // s1 stories
      [{ total: 100 }], // s2 XP
      [{ count: 3 }],   // s2 stories
    ];

    const db = createMockDb();
    db.select.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          const value = mockValues[callIndex] ?? [];
          callIndex++;
          return Promise.resolve(value);
        }),
      }),
    }));

    const result = await getClassAnalytics({
      db: db as MockDb,
      user: mockUser,
      tenant: mockTenant,
      input: { classId: "class-1" },
    });

    expect(result.studentCount).toBe(2);
    expect(result.students).toHaveLength(2);
    // Just verify the structure is correct
    expect(result.students[0]).toHaveProperty("studentId");
    expect(result.students[0]).toHaveProperty("xpTotal");
    expect(result.students[0]).toHaveProperty("storiesCompleted");
  });
});
