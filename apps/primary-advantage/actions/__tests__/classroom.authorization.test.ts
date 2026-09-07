import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClassCode, currentUser } = vi.hoisted(() => ({
  createClassCode: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({ generateSecureCode: () => "CODE1234" }));
vi.mock("@/lib/session", () => ({ currentUser }));
vi.mock("@/server/models/classroomModel", () => ({
  createClassCode,
  getClassroomStudentForLogin: vi.fn(),
}));

import { createClassroomCode } from "../classroom";

describe("createClassroomCode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies an unauthenticated caller without writing", async () => {
    currentUser.mockResolvedValue(null);

    await expect(createClassroomCode("class-1")).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
    expect(createClassCode).not.toHaveBeenCalled();
  });

  it("passes the authenticated teacher to the model", async () => {
    const actor = { id: "teacher-1", role: "TEACHER", schoolId: "school-1" };
    currentUser.mockResolvedValue(actor);
    createClassCode.mockResolvedValue({ id: "class-1" });

    await expect(createClassroomCode("class-1")).resolves.toEqual({
      success: true,
      code: "CODE1234",
    });
    expect(createClassCode).toHaveBeenCalledWith("class-1", "CODE1234", actor);
  });
});
