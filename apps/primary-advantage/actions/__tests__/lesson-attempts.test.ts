// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  restartLesson: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@reading-advantage/db", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), db: { marker: "db" } }));
vi.mock("@reading-advantage/domain/primary-lesson-attempts", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  restartLesson: mocks.restartLesson,
}));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: mocks.logError } }));

import { restartLessonAction } from "../lesson-attempts";

const ARTICLE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("restartLessonAction", () => {
  beforeEach(() => {
    mocks.currentUser.mockReset();
    mocks.restartLesson.mockReset();
    mocks.logError.mockReset();
  });

  it("returns Unauthorized for no user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    await expect(restartLessonAction({ articleId: ARTICLE })).resolves.toEqual({ success: false, error: "Unauthorized" });
    expect(mocks.restartLesson).not.toHaveBeenCalled();
  });

  it("returns the preview result for staff and calls no domain function", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "s1" });
    await expect(restartLessonAction({ articleId: ARTICLE })).resolves.toEqual({ status: "preview" });
    expect(mocks.restartLesson).not.toHaveBeenCalled();
  });

  it("calls restartLesson for a student and returns the new attempt number", async () => {
    const user = { id: "s1", role: "STUDENT", schoolId: "sc1" };
    mocks.currentUser.mockResolvedValue(user);
    mocks.restartLesson.mockResolvedValue({ closed: true, attemptNumber: 2 });
    const out = await restartLessonAction({ articleId: ARTICLE, assignmentId: null });
    expect(out).toEqual({ success: true, closed: true, attemptNumber: 2 });
    expect(mocks.restartLesson).toHaveBeenCalledWith({ db: { marker: "db" }, user, input: { articleId: ARTICLE, assignmentId: null } });
  });

  it("rejects a bad article id before the domain call", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s1", role: "STUDENT", schoolId: "sc1" });
    const out = await restartLessonAction({ articleId: "x" });
    expect(out).toMatchObject({ success: false });
    expect(mocks.restartLesson).not.toHaveBeenCalled();
  });

  it("logs a failure and returns a generic error", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s1", role: "STUDENT", schoolId: "sc1" });
    mocks.restartLesson.mockRejectedValue(new Error("db down"));
    const out = await restartLessonAction({ articleId: ARTICLE });
    expect(out).toEqual({ success: false, error: "Failed" });
    expect(mocks.logError).toHaveBeenCalledTimes(1);
  });
});
