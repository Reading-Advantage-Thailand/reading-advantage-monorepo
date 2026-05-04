import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { classesRouter } from "../routers/classes.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/domain/classes", () => ({
  createClass: vi.fn(),
  listClasses: vi.fn(),
}));

import { createClass, listClasses } from "@reading-advantage/domain/classes";

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } };
}>().create({
  transformer: superjson,
});

const appRouter = t.router({ classes: classesRouter });

function createCaller(
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } }
) {
  const tenantDb = createTenantDB({} as unknown as DB, auth.tenant);
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testSchoolId = "550e8400-e29b-41d4-a716-446655440001";
const testDate = new Date("2024-01-01T00:00:00Z");

function makeClassroomResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Math",
    schoolId: testSchoolId,
    teacherId: "t1",
    archived: false,
    createdAt: testDate,
    extraField: "should-be-stripped",
    ...overrides,
  };
}

describe("classes router", () => {
  describe("create", () => {
    it("returns created classroom with safe fields", async () => {
      const classroomRow = makeClassroomResponse();
      vi.mocked(createClass).mockResolvedValue(classroomRow as unknown as Awaited<ReturnType<typeof createClass>>);
      const caller = createCaller({ user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.classes.create({ name: "Math" });

      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(result.name).toBe("Math");
      expect(result).not.toHaveProperty("extraField");
    });
  });

  describe("list", () => {
    it("returns classrooms scoped to tenant", async () => {
      const classRows = [makeClassroomResponse()];
      vi.mocked(listClasses).mockResolvedValue(classRows as unknown as Awaited<ReturnType<typeof listClasses>>);
      const caller = createCaller({ user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.classes.list({});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(result[0]).not.toHaveProperty("extraField");
    });
  });
});
