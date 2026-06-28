import { describe, it, expect, vi, beforeEach } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { reportsRouter } from "../routers/reports.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/domain/reports", () => ({
  getStudentProgress: vi.fn(),
  getClassAnalytics: vi.fn(),
  getTeacherDashboard: vi.fn(),
}));

import { getTeacherDashboard, getStudentProgress, getClassAnalytics } from "@reading-advantage/domain/reports";

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

function createCaller(auth: {
  user: { id: string; role: string; schoolId?: string | null };
  tenant: { schoolId: string | null };
}) {
  const tenantDb = createTenantDB({} as unknown as DB, auth.tenant);
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testSchoolId = "550e8400-e29b-41d4-a716-446655440001";

beforeEach(() => {
  vi.mocked(getTeacherDashboard).mockReset();
  vi.mocked(getStudentProgress).mockReset();
  vi.mocked(getClassAnalytics).mockReset();
});

describe("reports router", () => {
  describe("teacherDashboard", () => {
    it("delegates to reports.getTeacherDashboard domain function", async () => {
      const domainResult = {
        classCount: 2,
        classes: [
          { id: "c1", name: "Math 101" },
          { id: "c2", name: "Science 201" },
        ],
      };
      vi.mocked(getTeacherDashboard).mockResolvedValue(
        domainResult as unknown as Awaited<ReturnType<typeof getTeacherDashboard>>
      );

      const caller = createCaller({
        user: { id: "t1", role: "TEACHER", schoolId: testSchoolId },
        tenant: { schoolId: testSchoolId },
      });

      const result = await caller.reports.teacherDashboard();

      // Domain function was called once with the context user and tenant
      expect(getTeacherDashboard).toHaveBeenCalledTimes(1);
      expect(getTeacherDashboard).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ id: "t1", role: "TEACHER" }),
          tenant: expect.objectContaining({ schoolId: testSchoolId }),
        })
      );

      // Transport mapping: router returns the domain result unchanged
      expect(result.classCount).toBe(2);
      expect(result.classes).toEqual([
        { id: "c1", name: "Math 101" },
        { id: "c2", name: "Science 201" },
      ]);
    });

    it("returns empty dashboard when domain function returns no classes", async () => {
      vi.mocked(getTeacherDashboard).mockResolvedValue({
        classCount: 0,
        classes: [],
      } as unknown as Awaited<ReturnType<typeof getTeacherDashboard>>);

      const caller = createCaller({
        user: { id: "t1", role: "TEACHER", schoolId: testSchoolId },
        tenant: { schoolId: testSchoolId },
      });

      const result = await caller.reports.teacherDashboard();

      expect(result.classCount).toBe(0);
      expect(result.classes).toEqual([]);
    });

    it("propagates domain FORBIDDEN errors as TRPC FORBIDDEN", async () => {
      const { AuthError } = await import("@reading-advantage/auth");
      vi.mocked(getTeacherDashboard).mockRejectedValue(
        new AuthError("User t1 (STUDENT) lacks permission: progress:read:all", "FORBIDDEN")
      );

      const caller = createCaller({
        user: { id: "t1", role: "STUDENT", schoolId: testSchoolId },
        tenant: { schoolId: testSchoolId },
      });

      await expect(caller.reports.teacherDashboard()).rejects.toThrow(
        /lacks permission/
      );
    });
  });
});