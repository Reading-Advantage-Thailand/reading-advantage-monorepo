import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { studentsRouter } from "../routers/students.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/domain/students", () => ({
  listStudents: vi.fn(),
  importRoster: vi.fn(),
}));

import { listStudents, importRoster } from "@reading-advantage/domain/students";

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } };
}>().create({
  transformer: superjson,
});

const appRouter = t.router({ students: studentsRouter });

function createCaller(
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } }
) {
  const tenantDb = createTenantDB({} as unknown as DB, auth.tenant);
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testSchoolId = "550e8400-e29b-41d4-a716-446655440001";

describe("students router", () => {
  describe("list", () => {
    it("returns students with safe fields", async () => {
      const studentRows = [
        { id: "s1", name: "Alice", email: "a@test.com", role: "STUDENT", xp: 100, level: 2, cefrLevel: "A1" },
      ];
      vi.mocked(listStudents).mockResolvedValue(studentRows as unknown as Awaited<ReturnType<typeof listStudents>>);
      const caller = createCaller({ user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.students.list({ classroomId: "550e8400-e29b-41d4-a716-446655440000" });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("s1");
      expect(result[0]).toHaveProperty("xp");
      expect(result[0]).toHaveProperty("cefrLevel");
    });
  });

  describe("importRoster", () => {
    it("returns import results", async () => {
      vi.mocked(importRoster).mockResolvedValue([{ username: "alice", id: "s1" }]);
      const caller = createCaller({ user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.students.importRoster({
        classroomId: "550e8400-e29b-41d4-a716-446655440000",
        students: [{ name: "Alice", username: "alice" }],
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].username).toBe("alice");
    });
  });
});
