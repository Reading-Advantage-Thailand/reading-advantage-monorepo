// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getTeachers: vi.fn(),
  getTeacherStatistics: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/server/utils/auth", () => ({
  validateUser: vi.fn().mockResolvedValue({ id: "u1", role: "SYSTEM", roles: [] }),
  checkAdminPermissions: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/server/models/teacherModel", () => ({
  getTeachers: mocks.getTeachers,
  getTeacherStatistics: mocks.getTeacherStatistics,
}));

import { getTeachersController } from "../teacherController";

const SCHOOL = "5c5c5c5c-0000-4000-8000-000000000001";

function get(query: string): NextRequest {
  return new Request(`http://localhost/api/teachers?${query}`) as NextRequest;
}

describe("getTeachersController schoolId filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "SYSTEM", schoolId: null });
    mocks.getTeachers.mockResolvedValue({ teachers: [], totalCount: 0 });
    mocks.getTeacherStatistics.mockResolvedValue({});
  });

  it("passes a UUID schoolId to the model", async () => {
    await getTeachersController(get(`schoolId=${SCHOOL}`));
    expect(mocks.getTeachers.mock.calls[0][0].schoolId).toBe(SCHOOL);
  });

  it("passes the schoolId to the statistics too", async () => {
    await getTeachersController(get(`schoolId=${SCHOOL}`));
    expect(mocks.getTeacherStatistics.mock.calls[0][1]).toBe(SCHOOL);
  });

  it("drops a schoolId that is not a UUID", async () => {
    await getTeachersController(get("schoolId=not-a-uuid"));
    expect(mocks.getTeachers.mock.calls[0][0].schoolId).toBeUndefined();
  });
});
