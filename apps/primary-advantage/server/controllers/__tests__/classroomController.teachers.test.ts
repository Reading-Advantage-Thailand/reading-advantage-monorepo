// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const CLASS_ID = "c1c1c1c1-0000-4000-8000-000000000001";

const mocks = vi.hoisted(() => {
  class SetClassroomTeachersError extends Error {
    constructor(
      readonly code: string,
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }
  return {
    currentUser: vi.fn(),
    updateClassroom: vi.fn(),
    setClassroomTeachers: vi.fn(),
    transaction: vi.fn(),
    tx: { marker: "tx" },
    SetClassroomTeachersError,
  };
});

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/server/models/classroomModel", () => ({ updateClassroom: mocks.updateClassroom }));
vi.mock("@reading-advantage/db", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("@reading-advantage/domain/classes", () => ({
  setClassroomTeachers: mocks.setClassroomTeachers,
  SetClassroomTeachersError: mocks.SetClassroomTeachersError,
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { updateClassroomController } from "../classroomController";

const admin = { id: "admin-1", role: "ADMIN", schoolId: "00000000-0000-0000-0000-000000000001" };

function patch(body: unknown): NextRequest {
  return new Request(`http://localhost/api/classroom/${CLASS_ID}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}
const context = { params: Promise.resolve({ id: CLASS_ID }) };

describe("updateClassroomController teacherIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue(admin);
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mocks.tx));
    mocks.updateClassroom.mockResolvedValue({ id: CLASS_ID, name: "P3B" });
    mocks.setClassroomTeachers.mockResolvedValue({ classroomId: CLASS_ID, teacherIds: ["t1"] });
  });

  it("runs the teacher change and the class update in one transaction", async () => {
    const res = await updateClassroomController(patch({ classroomName: "P3B", teacherIds: ["t1"] }), context);

    expect(res.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.setClassroomTeachers.mock.calls[0][0]).toMatchObject({
      db: mocks.tx,
      input: { classroomId: CLASS_ID, teacherIds: ["t1"] },
    });
    expect(mocks.updateClassroom.mock.calls[0][3]).toBe(mocks.tx);
  });

  it("uses no transaction when the body has no teacherIds", async () => {
    const res = await updateClassroomController(patch({ classroomName: "P3B" }), context);

    expect(res.status).toBe(200);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.setClassroomTeachers).not.toHaveBeenCalled();
  });

  it("returns 400 for a cross-school teacher and does not update the class", async () => {
    mocks.setClassroomTeachers.mockRejectedValue(
      new mocks.SetClassroomTeachersError("CROSS_SCHOOL_TEACHER", "Teacher is in another school", 400),
    );
    const res = await updateClassroomController(patch({ classroomName: "P3B", teacherIds: ["x"] }), context);

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("CROSS_SCHOOL_TEACHER");
    expect(mocks.updateClassroom).not.toHaveBeenCalled();
  });

  it("returns 404 and rolls back when the class update finds no class", async () => {
    mocks.updateClassroom.mockResolvedValue(null);
    const res = await updateClassroomController(patch({ classroomName: "P3B", teacherIds: ["t1"] }), context);

    expect(res.status).toBe(404);
  });
});
