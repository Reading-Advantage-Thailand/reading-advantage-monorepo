// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  deleteFrom: vi.fn(),
  getArticleById: vi.fn(),
  generateAudio: vi.fn(),
  generateWordLists: vi.fn(),
  deleteFile: vi.fn(),
  uploadToBucket: vi.fn(),
  generateImage: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@reading-advantage/db", () => ({
  db: { select: mocks.select, delete: mocks.deleteFrom },
  articles: { id: "articles.id" },
  eq: vi.fn(() => ({})),
}));
vi.mock("@/server/models/articleModel", () => ({
  getArticleById: mocks.getArticleById,
}));
vi.mock("@/server/utils/generators/audio-generator", () => ({
  generateAudio: mocks.generateAudio,
}));
vi.mock("@/server/utils/generators/audio-word-generator", () => ({
  generateWordLists: mocks.generateWordLists,
}));
vi.mock("@/utils/storage", () => ({
  deleteFile: mocks.deleteFile,
  uploadToBucket: mocks.uploadToBucket,
}));
vi.mock("@/server/utils/generators/image-generator", () => ({
  generateImage: mocks.generateImage,
}));

import {
  deleteAllArticles,
  deleteArticleFile,
  generateAudios,
  generateImages,
  generateWordAudios,
  uploadArticleImages,
} from "../test";

const student = { id: "student-1", role: "STUDENT", schoolId: "school-a" };

describe("test server actions authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects deleteAllArticles for anonymous and student callers", async () => {
    mocks.currentUser.mockResolvedValue(null);
    await expect(deleteAllArticles()).resolves.toMatchObject({
      success: false,
    });

    mocks.currentUser.mockResolvedValue(student);
    await expect(deleteAllArticles()).resolves.toMatchObject({
      success: false,
      error: "Forbidden",
    });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.deleteFrom).not.toHaveBeenCalled();
    expect(mocks.deleteFile).not.toHaveBeenCalled();
  });

  it("rejects a student across the remaining test actions", async () => {
    mocks.currentUser.mockResolvedValue(student);

    await expect(generateAudios("article-1")).resolves.toMatchObject({
      success: false,
      error: "Forbidden",
    });
    await expect(generateWordAudios("article-1")).resolves.toMatchObject({
      success: false,
      error: "Forbidden",
    });
    await expect(uploadArticleImages("article-1")).resolves.toMatchObject({
      success: false,
      error: "Forbidden",
    });
    await expect(deleteArticleFile("article-1")).resolves.toMatchObject({
      success: false,
      error: "Forbidden",
    });
    await expect(generateImages("article-1")).resolves.toMatchObject({
      success: false,
      error: "Forbidden",
    });
    expect(mocks.getArticleById).not.toHaveBeenCalled();
    expect(mocks.generateAudio).not.toHaveBeenCalled();
    expect(mocks.generateWordLists).not.toHaveBeenCalled();
    expect(mocks.uploadToBucket).not.toHaveBeenCalled();
    expect(mocks.deleteFile).not.toHaveBeenCalled();
    expect(mocks.generateImage).not.toHaveBeenCalled();
  });
});
