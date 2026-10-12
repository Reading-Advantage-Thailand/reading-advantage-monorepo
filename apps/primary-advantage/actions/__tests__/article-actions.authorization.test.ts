// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getArticleActivity: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@/server/models/articleModel", () => ({
  getArticleActivity: mocks.getArticleActivity,
}));
vi.mock("@reading-advantage/db", () => ({
  db: { select: vi.fn() },
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  userActivity: { userId: "userActivity.userId" },
  xpLogs: { userId: "xpLogs.userId" },
}));

import { fetchArticleActivity } from "../article";

const student = { id: "student-1", role: "STUDENT", schoolId: "school-a" };

describe("article server actions authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects article activity tracking without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);

    await expect(fetchArticleActivity("article-1")).resolves.toMatchObject({
      success: false,
      error: "Unauthorized",
    });
    expect(mocks.getArticleActivity).not.toHaveBeenCalled();
  });
});
