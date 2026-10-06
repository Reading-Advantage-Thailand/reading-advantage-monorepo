// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getAssignmentById: vi.fn() }));
vi.mock("@/server/models/assignmentModel", async () => {
  class AssignmentForbiddenError extends Error {}
  return {
    default: mocks.getAssignmentById,
    AssignmentForbiddenError,
    getAssignments: vi.fn(),
    getStudentAssignments: vi.fn(),
    createAssignment: vi.fn(),
    updateUserLessonProgress: vi.fn(),
    getUserLessonProgress: vi.fn(),
    getAssignmentActivityById: vi.fn(),
  };
});

import { fetchAssignmentById } from "../assignmentController";
import { AssignmentForbiddenError } from "@/server/models/assignmentModel";

describe("fetchAssignmentById cross-tenant denial", () => {
  it("returns 403, not 500, when the model denies access", async () => {
    mocks.getAssignmentById.mockRejectedValue(new AssignmentForbiddenError());
    const response = await fetchAssignmentById({} as NextRequest, {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("still returns 500 for unexpected failures", async () => {
    mocks.getAssignmentById.mockRejectedValue(new Error("db down"));
    const response = await fetchAssignmentById({} as NextRequest, {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(response.status).toBe(500);
  });
});
