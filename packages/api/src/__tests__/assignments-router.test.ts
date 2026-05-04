import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { assignmentsRouter } from "../routers/assignments.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/domain/assignments", () => ({
  createAssignment: vi.fn(),
  listAssignments: vi.fn(),
  getAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  submitAssignment: vi.fn(),
}));

import {
  createAssignment,
  listAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
} from "@reading-advantage/domain/assignments";

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } };
}>().create({
  transformer: superjson,
});

const appRouter = t.router({ assignments: assignmentsRouter });

function createCaller(
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } }
) {
  const tenantDb = createTenantDB({} as unknown as DB, auth.tenant);
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testSchoolId = "550e8400-e29b-41d4-a716-446655440001";
const testDate = new Date("2024-01-01T00:00:00Z");

function makeAssignmentResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "HW1",
    classroomId: "550e8400-e29b-41d4-a716-446655440002",
    teacherId: "t1",
    articleId: null,
    lessonId: null,
    dueDate: null,
    type: "article",
    createdAt: testDate,
    extraField: "should-be-stripped",
    ...overrides,
  };
}

describe("assignments router", () => {
  describe("create", () => {
    it("returns created assignment with safe fields", async () => {
      const assignmentRow = makeAssignmentResponse();
      vi.mocked(createAssignment).mockResolvedValue(assignmentRow as unknown as Awaited<ReturnType<typeof createAssignment>>);
      const caller = createCaller({ user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.assignments.create({
        title: "HW1",
        classroomId: "550e8400-e29b-41d4-a716-446655440002",
        type: "article",
      });

      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(result).not.toHaveProperty("extraField");
    });
  });

  describe("list", () => {
    it("returns assignments with safe fields", async () => {
      const assignmentRows = [makeAssignmentResponse()];
      vi.mocked(listAssignments).mockResolvedValue(assignmentRows as unknown as Awaited<ReturnType<typeof listAssignments>>);
      const caller = createCaller({ user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.assignments.list({ classroomId: "550e8400-e29b-41d4-a716-446655440002" });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(result[0]).not.toHaveProperty("extraField");
    });
  });

  describe("get", () => {
    it("returns assignment with safe fields", async () => {
      const assignmentRow = makeAssignmentResponse();
      vi.mocked(getAssignment).mockResolvedValue(assignmentRow as unknown as Awaited<ReturnType<typeof getAssignment>>);
      const caller = createCaller({ user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.assignments.get({ id: "550e8400-e29b-41d4-a716-446655440001" });

      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(result).not.toHaveProperty("extraField");
    });
  });

  describe("update", () => {
    it("returns updated assignment with safe fields", async () => {
      const assignmentRow = makeAssignmentResponse({ title: "Updated HW" });
      vi.mocked(updateAssignment).mockResolvedValue(assignmentRow as unknown as Awaited<ReturnType<typeof updateAssignment>>);
      const caller = createCaller({ user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.assignments.update({
        id: "550e8400-e29b-41d4-a716-446655440001",
        title: "Updated HW",
      });

      expect(result.title).toBe("Updated HW");
      expect(result).not.toHaveProperty("extraField");
    });
  });

  describe("delete", () => {
    it("returns success shape", async () => {
      vi.mocked(deleteAssignment).mockResolvedValue({ success: true });
      const caller = createCaller({ user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.assignments.delete({ id: "550e8400-e29b-41d4-a716-446655440001" });

      expect(result.success).toBe(true);
    });
  });

  describe("submit", () => {
    it("returns submission with safe fields", async () => {
      const submissionRow = {
        id: "550e8400-e29b-41d4-a716-446655440003",
        assignmentId: "550e8400-e29b-41d4-a716-446655440001",
        studentId: "st1",
        completed: true,
        score: 85,
        completedAt: testDate,
        createdAt: testDate,
        updatedAt: testDate,
      };
      vi.mocked(submitAssignment).mockResolvedValue(submissionRow as unknown as Awaited<ReturnType<typeof submitAssignment>>);
      const caller = createCaller({ user: { id: "st1", role: "STUDENT" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.assignments.submit({
        assignmentId: "550e8400-e29b-41d4-a716-446655440001",
        score: 85,
      });

      expect(result.score).toBe(85);
      expect(result.completed).toBe(true);
    });
  });
});
