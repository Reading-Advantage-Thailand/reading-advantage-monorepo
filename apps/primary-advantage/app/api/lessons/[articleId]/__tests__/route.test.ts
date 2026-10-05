import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: "s1", role: "STUDENT", schoolId: "school-1" } as Record<string, unknown> | null,
  updateStandaloneLessonProgress: vi.fn(),
  recordLessonProgress: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-books", () => ({ recordLessonProgress: mocks.recordLessonProgress }));
vi.mock("@/server/models/lessonModel", () => ({
  getArticleForLesson: vi.fn(),
  updateStandaloneLessonProgress: mocks.updateStandaloneLessonProgress,
}));

import { POST } from "../route";

const ARTICLE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

/**
 * Posts a lesson progress body to the route.
 * @param body The request body.
 * @returns The response.
 */
function post(body: unknown) {
  const request = new NextRequest(`http://localhost/api/lessons/${ARTICLE}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  return POST(request, { params: Promise.resolve({ articleId: ARTICLE }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "s1", role: "STUDENT", schoolId: "school-1" };
  mocks.updateStandaloneLessonProgress.mockResolvedValue({ success: true });
  mocks.recordLessonProgress.mockResolvedValue(1);
});

describe("POST /api/lessons/[articleId] (class book progress hook, FR-5)", () => {
  it("records the reached app step from the 14-step percent", async () => {
    // step 3 of 14 = 21 %
    const response = await post({ progress: 21, timeSpent: 90.4 });
    expect(response.status).toBe(200);
    expect(mocks.updateStandaloneLessonProgress).toHaveBeenCalledWith("s1", ARTICLE, 21, 90.4);
    expect(mocks.recordLessonProgress).toHaveBeenCalledWith({ db: {}, user: mocks.user, input: { articleId: ARTICLE, reachedStep: 3, seconds: 90 } });
  });

  it("maps 100 % to step 14 and 7 % to step 1", async () => {
    await post({ progress: 100, timeSpent: 0 });
    expect(mocks.recordLessonProgress).toHaveBeenLastCalledWith(expect.objectContaining({ input: expect.objectContaining({ reachedStep: 14 }) }));
    await post({ progress: 7, timeSpent: 0 });
    expect(mocks.recordLessonProgress).toHaveBeenLastCalledWith(expect.objectContaining({ input: expect.objectContaining({ reachedStep: 1 }) }));
  });

  it("keeps the lesson going when the class book write fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.recordLessonProgress.mockRejectedValueOnce(new Error("down"));
    const response = await post({ progress: 50, timeSpent: 10 });
    expect(response.status).toBe(200);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("rejects a bad body before any write", async () => {
    const response = await post({ progress: 150, timeSpent: 1 });
    expect(response.status).toBe(400);
    expect(mocks.recordLessonProgress).not.toHaveBeenCalled();
  });

  it("needs a signed-in user", async () => {
    mocks.user = null;
    expect((await post({ progress: 7, timeSpent: 1 })).status).toBe(401);
  });
});
