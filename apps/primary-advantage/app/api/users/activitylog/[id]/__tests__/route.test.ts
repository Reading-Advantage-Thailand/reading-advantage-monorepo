// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  handleUpdateUserActivity: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@/server/controllers/userController", () => ({
  handleUpdateUserActivity: mocks.handleUpdateUserActivity,
}));

import { POST } from "../route";

/**
 * Builds an activitylog request with a JSON body.
 * @param id The target user id.
 * @param body The request payload.
 * @returns The request and route context.
 */
function postRequest(id: string, body: unknown) {
  const request = new Request(
    `http://localhost/api/users/activitylog/${id}`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    },
  ) as NextRequest;
  return { request, context: { params: Promise.resolve({ id }) } };
}

const validBody = { articleId: "a-1", data: {}, timer: 10, type: "MC_QUESTION" };

describe("POST /api/users/activitylog/[id] authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);

    const { request, context } = postRequest("student-1", validBody);
    const response = await POST(request, context);

    expect(response.status).toBe(401);
    expect(mocks.handleUpdateUserActivity).not.toHaveBeenCalled();
  });

  it("returns 403 when a student logs for another user", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
      schoolId: "school-a",
    });

    const { request, context } = postRequest("student-2", validBody);
    const response = await POST(request, context);

    expect(response.status).toBe(403);
    expect(mocks.handleUpdateUserActivity).not.toHaveBeenCalled();
  });

  it("accepts a self log from an authenticated student", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
      schoolId: "school-a",
    });
    mocks.handleUpdateUserActivity.mockResolvedValue({});

    const { request, context } = postRequest("student-1", validBody);
    const response = await POST(request, context);

    expect(response.status).toBe(200);
    expect(mocks.handleUpdateUserActivity).toHaveBeenCalled();
  });
});
