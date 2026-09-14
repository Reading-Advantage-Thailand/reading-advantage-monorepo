// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  generateAllArticle: vi.fn(),
  generateAllArticleNew: vi.fn(),
  deleteArticleByIdModel: vi.fn(),
  getArticleActivity: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@/server/controllers/articleController", () => ({
  generateAllArticle: mocks.generateAllArticle,
  generateAllArticleNew: mocks.generateAllArticleNew,
}));
vi.mock("@/server/models/articleModel", () => ({
  deleteArticleByIdModel: mocks.deleteArticleByIdModel,
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

import {
  fetchArticleActivity,
  generateArticle,
  generateArticleNew,
  getDeleteArticleById,
} from "../article";

const student = { id: "student-1", role: "STUDENT", schoolId: "school-a" };

describe("article server actions authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects generation and deletion for a student caller", async () => {
    mocks.currentUser.mockResolvedValue(student);

    await expect(generateArticle(2)).resolves.toMatchObject({
      success: false,
      error: "Forbidden",
    });
    await expect(generateArticleNew(2)).resolves.toMatchObject({
      success: false,
      error: "Forbidden",
    });
    await expect(getDeleteArticleById("article-1")).resolves.toMatchObject({
      success: false,
      error: "Forbidden",
    });
    expect(mocks.generateAllArticle).not.toHaveBeenCalled();
    expect(mocks.generateAllArticleNew).not.toHaveBeenCalled();
    expect(mocks.deleteArticleByIdModel).not.toHaveBeenCalled();
  });

  it("rejects article activity tracking without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);

    await expect(fetchArticleActivity("article-1")).resolves.toMatchObject({
      success: false,
      error: "Unauthorized",
    });
    expect(mocks.getArticleActivity).not.toHaveBeenCalled();
  });
});
