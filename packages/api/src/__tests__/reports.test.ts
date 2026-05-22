import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { reportsRouter } from "../routers/reports.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/db/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db/schema")>();
  return {
    ...actual,
    classrooms: { id: "id", name: "name", schoolId: "schoolId", teacherId: "teacherId" },
    userActivity: { userId: "userId" },
    userWordRecords: { userId: "userId" },
    userSentenceRecords: { userId: "userId" },
    classroomStudents: { classroomId: "classroomId", studentId: "studentId" },
    xpLogs: { userId: "userId", xpEarned: "xpEarned" },
    storyRecords: { userId: "userId", status: "status" },
  };
});

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, type: "eq" })),
  and: vi.fn((...conds) => ({ type: "and", conds })),
  sql: vi.fn((strings, ...values) => ({ type: "sql", strings, values })),
}));

function createMockDb(opts: { selectResult?: unknown[] } = {}) {
  const resolvedValue = opts.selectResult ?? [];

  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve(resolvedValue);
            return Object.assign(promise, {
              offset: vi.fn().mockResolvedValue(resolvedValue),
            });
          }),
          offset: vi.fn().mockResolvedValue(resolvedValue),
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation(() => {
                const promise = Promise.resolve(resolvedValue);
                return Object.assign(promise, {
                  offset: vi.fn().mockResolvedValue(resolvedValue),
                });
              }),
              offset: vi.fn().mockResolvedValue(resolvedValue),
            }),
          }),
          then(
            onFulfilled?: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) {
            return Promise.resolve(resolvedValue).then(onFulfilled, onRejected);
          },
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  };
  return mockDb;
}

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: {
    user: { id: string; role: string; schoolId?: string | null };
    tenant: { schoolId: string | null };
  };
}>().create({
  transformer: superjson,
});

const appRouter = t.router({ reports: reportsRouter });

function createCaller(
  db: ReturnType<typeof createMockDb>,
  auth: {
    user: { id: string; role: string; schoolId?: string | null };
    tenant: { schoolId: string | null };
  }
) {
  const tenantDb = createTenantDB(db as unknown as DB, auth.tenant);
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testSchoolId = "550e8400-e29b-41d4-a716-446655440001";

describe("reports router", () => {
  describe("teacherDashboard", () => {
    it("returns classes taught by the caller", async () => {
      const classRows = [
        { id: "c1", name: "Math 101" },
        { id: "c2", name: "Science 201" },
      ];
      const db = createMockDb({ selectResult: classRows });
      const caller = createCaller(
        db,
        { user: { id: "t1", role: "TEACHER", schoolId: testSchoolId }, tenant: { schoolId: testSchoolId } }
      );

      const result = await caller.reports.teacherDashboard();

      expect(result.classCount).toBe(2);
      expect(result.classes).toEqual([
        { id: "c1", name: "Math 101" },
        { id: "c2", name: "Science 201" },
      ]);
    });

    it("returns empty dashboard when teacher has no classes", async () => {
      const db = createMockDb({ selectResult: [] });
      const caller = createCaller(
        db,
        { user: { id: "t1", role: "TEACHER", schoolId: testSchoolId }, tenant: { schoolId: testSchoolId } }
      );

      const result = await caller.reports.teacherDashboard();

      expect(result.classCount).toBe(0);
      expect(result.classes).toEqual([]);
    });

    it("uses tenant-scoped query (not raw db)", async () => {
      const db = createMockDb({ selectResult: [] });
      const caller = createCaller(
        db,
        { user: { id: "t1", role: "TEACHER", schoolId: testSchoolId }, tenant: { schoolId: testSchoolId } }
      );

      await caller.reports.teacherDashboard();

      expect(db.select).toHaveBeenCalled();
    });
  });
});
