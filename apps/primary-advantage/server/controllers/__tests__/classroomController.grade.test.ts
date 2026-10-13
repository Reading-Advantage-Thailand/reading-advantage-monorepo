// @vitest-environment node
/** H-1: the PATCH body accepts the grade as a number or a string (the list returns the integer). */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const CLASS_ID = "c1c1c1c1-0000-4000-8000-000000000001";
const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), updateClassroom: vi.fn() }));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/server/models/classroomModel", () => ({ updateClassroom: mocks.updateClassroom }));
vi.mock("@reading-advantage/db", () => ({ db: { transaction: vi.fn() } }));
vi.mock("@reading-advantage/domain/classes", () => ({
  setClassroomTeachers: vi.fn(),
  SetClassroomTeachersError: class extends Error {},
}));
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { updateClassroomController } from "../classroomController";

function patch(body: unknown): NextRequest {
  return new Request(`http://localhost/api/classroom/${CLASS_ID}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}
const context = { params: Promise.resolve({ id: CLASS_ID }) };

describe("updateClassroomController grade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "s1" });
    mocks.updateClassroom.mockResolvedValue({ id: CLASS_ID, name: "P3B" });
  });

  it("accepts a number grade and passes one string form to the model", async () => {
    const res = await updateClassroomController(patch({ classroomName: "P3B", grade: 4 }), context);
    expect(res.status).toBe(200);
    expect(mocks.updateClassroom.mock.calls[0][1]).toEqual({ name: "P3B", grade: "4" });
  });

  it("accepts a string grade", async () => {
    const res = await updateClassroomController(patch({ classroomName: "P3B", grade: "12" }), context);
    expect(res.status).toBe(200);
    expect(mocks.updateClassroom.mock.calls[0][1]).toEqual({ name: "P3B", grade: "12" });
  });

  it.each([0, 13, 2.5, "13", "x"])("refuses the grade %s", async (grade) => {
    const res = await updateClassroomController(patch({ classroomName: "P3B", grade }), context);
    expect(res.status).toBe(400);
  });
});
