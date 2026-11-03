import { describe, it, expect, vi, beforeEach } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { reportsRouter } from "../routers/reports.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/domain/reports", () => ({
  getStudentProgress: vi.fn(),
  getClassAnalytics: vi.fn(),
  getTeacherDashboard: vi.fn(),
}));

import { getStudentProgress, getClassAnalytics } from "@reading-advantage/domain/reports";

type Auth = { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } | null;

const t = initTRPC.context<{ tenantDb: ReturnType<typeof createTenantDB>; auth: Auth }>().create({ transformer: superjson });
const appRouter = t.router({ reports: reportsRouter });
const schoolId = "550e8400-e29b-41d4-a716-446655440001";
const teacher = { id: "t1", role: "TEACHER", schoolId };

function createCaller(auth: Auth) {
  const tenantDb = createTenantDB({} as unknown as DB, auth?.tenant ?? { schoolId: null });
  return t.createCallerFactory(appRouter)({ tenantDb, auth } as never);
}

const caller = () => createCaller({ user: teacher, tenant: { schoolId } });

beforeEach(() => {
  vi.mocked(getStudentProgress).mockReset();
  vi.mocked(getClassAnalytics).mockReset();
});

describe("reports.studentProgress", () => {
  it("delegates with the session user, tenant and input", async () => {
    vi.mocked(getStudentProgress).mockResolvedValue({ studentId: "s1", activities: [], wordRecords: [], sentenceRecords: [], xpTotal: 30, storiesCompleted: 1 } as never);

    const result = await caller().reports.studentProgress({ studentId: "s1" });

    expect(result).toEqual({ studentId: "s1", activities: [], wordRecords: [], sentenceRecords: [], xpTotal: 30, storiesCompleted: 1 });
    expect(getStudentProgress).toHaveBeenCalledWith(expect.objectContaining({
      user: teacher,
      tenant: { schoolId },
      input: { studentId: "s1" },
    }));
  });

  it("rejects an anonymous caller before the domain", async () => {
    await expect(createCaller(null).reports.studentProgress({ studentId: "s1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(getStudentProgress).not.toHaveBeenCalled();
  });

  it("rejects a missing studentId with BAD_REQUEST", async () => {
    await expect(caller().reports.studentProgress({} as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(getStudentProgress).not.toHaveBeenCalled();
  });

  it("propagates a domain FORBIDDEN error", async () => {
    vi.mocked(getStudentProgress).mockRejectedValue(new TRPCError({ code: "FORBIDDEN", message: "not your student" }));

    await expect(caller().reports.studentProgress({ studentId: "s2" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("fails with INTERNAL_SERVER_ERROR when the result breaks the report contract", async () => {
    vi.mocked(getStudentProgress).mockResolvedValue({ studentId: "s1" } as never);

    await expect(caller().reports.studentProgress({ studentId: "s1" })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

describe("reports.classAnalytics", () => {
  it("delegates and returns the class analytics", async () => {
    const analytics = { classId: "c1", studentCount: 1, totalXp: 50, averageXp: 50, students: [{ studentId: "s1", xpTotal: 50, storiesCompleted: 2 }] };
    vi.mocked(getClassAnalytics).mockResolvedValue(analytics as never);

    await expect(caller().reports.classAnalytics({ classId: "c1" })).resolves.toEqual(analytics);
    expect(getClassAnalytics).toHaveBeenCalledWith(expect.objectContaining({ user: teacher, tenant: { schoolId }, input: { classId: "c1" } }));
  });

  it("rejects an anonymous caller before the domain", async () => {
    await expect(createCaller(null).reports.classAnalytics({ classId: "c1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(getClassAnalytics).not.toHaveBeenCalled();
  });

  it("fails with INTERNAL_SERVER_ERROR when a student row lacks xp", async () => {
    vi.mocked(getClassAnalytics).mockResolvedValue({ classId: "c1", studentCount: 1, students: [{ studentId: "s1" }] } as never);

    await expect(caller().reports.classAnalytics({ classId: "c1" })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
