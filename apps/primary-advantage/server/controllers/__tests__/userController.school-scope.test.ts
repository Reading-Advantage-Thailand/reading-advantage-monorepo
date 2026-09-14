// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getUserById: vi.fn(),
  getUserActivity: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("../../models/userModel", () => ({
  getUserById: mocks.getUserById,
  getUserActivity: mocks.getUserActivity,
}));

import { fetchUserActivity } from "../userController";

const teacherA = { id: "teacher-a", role: "TEACHER", schoolId: "school-a" };

describe("fetchUserActivity school scope", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies a teacher reading another school's student", async () => {
    mocks.currentUser.mockResolvedValue(teacherA);
    mocks.getUserById.mockResolvedValue({ id: "student-b", schoolId: "school-b" });

    const result = await fetchUserActivity("student-b");

    expect(result).toBeUndefined();
    expect(mocks.getUserActivity).not.toHaveBeenCalled();
  });

  it("serves a teacher reading their own school's student", async () => {
    mocks.currentUser.mockResolvedValue(teacherA);
    mocks.getUserById.mockResolvedValue({ id: "student-a", schoolId: "school-a" });
    mocks.getUserActivity.mockResolvedValue({
      activity: [],
      xpLogs: [],
      user: { id: "student-a" },
    });

    const result = await fetchUserActivity("student-a");

    expect(result).toMatchObject({ user: { id: "student-a" } });
    expect(mocks.getUserActivity).toHaveBeenCalledWith("student-a");
  });

  it("serves a student reading their own progress", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "student-a",
      role: "STUDENT",
      schoolId: "school-a",
    });
    mocks.getUserById.mockResolvedValue({ id: "student-a", schoolId: "school-a" });
    mocks.getUserActivity.mockResolvedValue({
      activity: [],
      xpLogs: [],
      user: { id: "student-a" },
    });

    const result = await fetchUserActivity("student-a");

    expect(result).toMatchObject({ user: { id: "student-a" } });
  });
});
