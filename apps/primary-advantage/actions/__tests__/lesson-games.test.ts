// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getLessonPracticeInput: vi.fn(),
  getLessonGameResults: vi.fn(),
  listSample: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: (_db: unknown, tenant: unknown) => ({ tenant }) }));
vi.mock("@reading-advantage/domain/games", () => ({ getLessonPracticeInput: mocks.getLessonPracticeInput, getLessonGameResults: mocks.getLessonGameResults, listPrimarySamplePracticeInput: mocks.listSample }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: mocks.logError } }));

import { getLessonGameInputAction, getLessonGameResultsAction } from "../lesson-games";

const ARTICLE = "11111111-1111-4111-8111-111111111111";
const BOOK = "22222222-2222-4222-8222-222222222222";
const student = { id: "s1", role: "STUDENT", schoolId: "school-1" };
const input = { schemaVersion: 1, id: `lesson:${ARTICLE}`, level: "A1", vocabulary: [], sentences: [] };
const sample = { schemaVersion: 1, id: "sample", level: "A1", vocabulary: [{ id: "sample-word-1", term: "river", translation: "แม่น้ำ" }], sentences: [] };

describe("getLessonGameInputAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses a request without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    await expect(getLessonGameInputAction({ articleId: ARTICLE })).resolves.toEqual({ success: false, error: "Unauthorized" });
    expect(mocks.getLessonPracticeInput).not.toHaveBeenCalled();
  });

  it("returns the lesson input scoped to the school of the user", async () => {
    mocks.currentUser.mockResolvedValue(student);
    mocks.getLessonPracticeInput.mockResolvedValue(input);
    const result = await getLessonGameInputAction({ articleId: ARTICLE, locale: "th" });
    expect(result).toEqual({ success: true, input });
    expect(mocks.getLessonPracticeInput).toHaveBeenCalledWith(
      expect.objectContaining({ user: student, tenant: { schoolId: "school-1" }, input: { articleId: ARTICLE, locale: "th" } }),
    );
  });

  it("logs a failure and returns a message without detail", async () => {
    mocks.currentUser.mockResolvedValue(student);
    mocks.getLessonPracticeInput.mockRejectedValue(new Error("secret detail"));
    const result = await getLessonGameInputAction({ articleId: ARTICLE });
    expect(result).toEqual({ success: false, error: "Lesson game input failed" });
    expect(mocks.logError).toHaveBeenCalledWith("lesson_game_input_failed", expect.objectContaining({ articleId: ARTICLE, userId: "s1" }));
  });

  it.each(["TEACHER", "ADMIN"])("gives %s in a rehearsal or a preview the read-only sample set when no class book is named", async (role) => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role, schoolId: "school-1" });
    // The production guard: the domain refuses a non-student who does not name the class book.
    mocks.getLessonPracticeInput.mockRejectedValue(new Error("A teacher needs the class book of the lesson"));
    mocks.listSample.mockResolvedValue(sample);
    const result = await getLessonGameInputAction({ articleId: ARTICLE, locale: "th" });
    expect(result).toEqual({ success: true, input: sample });
    expect(mocks.listSample).toHaveBeenCalledWith({ db: {}, input: { locale: "th" } });
    expect(mocks.getLessonPracticeInput).not.toHaveBeenCalled();
  });

  it("keeps the class-book proof path for a staff member who names the book (the projector)", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "school-1" });
    mocks.getLessonPracticeInput.mockResolvedValue(input);
    const result = await getLessonGameInputAction({ articleId: ARTICLE, locale: "th", classBookId: BOOK, lessonNumber: 3 });
    expect(result).toEqual({ success: true, input });
    expect(mocks.getLessonPracticeInput).toHaveBeenCalledWith(
      expect.objectContaining({ input: { articleId: ARTICLE, locale: "th", classBookId: BOOK, lessonNumber: 3 } }),
    );
    expect(mocks.listSample).not.toHaveBeenCalled();
  });
});

describe("getLessonGameResultsAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses a request without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    await expect(getLessonGameResultsAction({ articleId: ARTICLE })).resolves.toEqual({ success: false, error: "Unauthorized" });
    expect(mocks.getLessonGameResults).not.toHaveBeenCalled();
  });

  it("returns the results of the user in the school of the user", async () => {
    mocks.currentUser.mockResolvedValue(student);
    const results = { latest: [], totalXp: 0 };
    mocks.getLessonGameResults.mockResolvedValue(results);
    await expect(getLessonGameResultsAction({ articleId: ARTICLE })).resolves.toEqual({ success: true, results });
    expect(mocks.getLessonGameResults).toHaveBeenCalledWith(
      expect.objectContaining({ user: student, tenant: { schoolId: "school-1" }, input: { articleId: ARTICLE } }),
    );
  });

  it("logs a failure and returns a message without detail", async () => {
    mocks.currentUser.mockResolvedValue(student);
    mocks.getLessonGameResults.mockRejectedValue(new Error("secret detail"));
    await expect(getLessonGameResultsAction({ articleId: ARTICLE })).resolves.toEqual({ success: false, error: "Lesson game results failed" });
    expect(mocks.logError).toHaveBeenCalledWith("lesson_game_results_failed", expect.objectContaining({ articleId: ARTICLE, userId: "s1" }));
  });

  it.each(["TEACHER", "ADMIN"])("returns empty results without a read for %s in a preview", async (role) => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role, schoolId: "school-1" });
    await expect(getLessonGameResultsAction({ articleId: ARTICLE })).resolves.toEqual({ success: true, results: { latest: [], totalXp: 0 } });
    expect(mocks.getLessonGameResults).not.toHaveBeenCalled();
  });
});
