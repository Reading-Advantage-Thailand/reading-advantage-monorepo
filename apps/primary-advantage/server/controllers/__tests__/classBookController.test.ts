// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordLessonProgress: vi.fn(),
  getClassBookProgress: vi.fn(),
  toProgressCsv: vi.fn(),
}));
vi.mock("@reading-advantage/db", () => ({ db: { tag: "db" } }));
vi.mock("@reading-advantage/domain/primary-books", () => mocks);

import { exportClassBookProgress, recordLessonStep } from "../classBookController";

const user = { id: "u1", role: "STUDENT", schoolId: "s1" } as never;

beforeEach(() => vi.clearAllMocks());

describe("recordLessonStep", () => {
  it("maps the 14-step percent to the reached step and rounds the seconds", async () => {
    mocks.recordLessonProgress.mockResolvedValue(1);
    await recordLessonStep(user, "a1", 21, 89.6, "test");
    expect(mocks.recordLessonProgress).toHaveBeenCalledWith({
      db: { tag: "db" },
      user,
      input: { articleId: "a1", reachedStep: 3, seconds: 90 },
    });
  });

  it("clamps the step to 1..14", async () => {
    mocks.recordLessonProgress.mockResolvedValue(1);
    await recordLessonStep(user, "a1", 0, 0, "test");
    expect(mocks.recordLessonProgress).toHaveBeenLastCalledWith(expect.objectContaining({ input: expect.objectContaining({ reachedStep: 1 }) }));
    await recordLessonStep(user, "a1", 100, 0, "test");
    expect(mocks.recordLessonProgress).toHaveBeenLastCalledWith(expect.objectContaining({ input: expect.objectContaining({ reachedStep: 14 }) }));
  });

  it("logs and swallows a domain failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.recordLessonProgress.mockRejectedValue(new Error("down"));
    await expect(recordLessonStep(user, "a1", 50, 10, "test")).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith("Class book progress for test failed:", expect.any(Error));
    error.mockRestore();
  });
});

describe("exportClassBookProgress", () => {
  it("returns the CSV and the book key", async () => {
    mocks.getClassBookProgress.mockResolvedValue({ classBook: { bookKey: "ebb1" } });
    mocks.toProgressCsv.mockReturnValue("a,b\n");
    await expect(exportClassBookProgress(user, "cb1")).resolves.toEqual({ csv: "a,b\n", bookKey: "ebb1" });
    expect(mocks.getClassBookProgress).toHaveBeenCalledWith({ db: { tag: "db" }, user, classBookId: "cb1" });
  });

  it("passes a domain error through", async () => {
    mocks.getClassBookProgress.mockRejectedValue(Object.assign(new Error("no"), { code: "FORBIDDEN" }));
    await expect(exportClassBookProgress(user, "cb1")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
