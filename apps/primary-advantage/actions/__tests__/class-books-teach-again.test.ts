// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), teachLessonAgain: vi.fn(), logWarn: vi.fn(), logError: vi.fn() }));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: mocks.logWarn, error: mocks.logError } }));
vi.mock("@reading-advantage/domain/primary-books", () => ({
  assignClassBook: vi.fn(),
  markLessonTaught: vi.fn(),
  markStepDone: vi.fn(),
  setCurrentLesson: vi.fn(),
  teachLessonAgain: mocks.teachLessonAgain,
}));

import { teachLessonAgainAction } from "../class-books";

const BOOK = "22222222-2222-4222-8222-222222222222";

describe("teachLessonAgainAction logging (M-17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "school-1" });
  });

  it("logs the skipped students and the failed audit write, and still succeeds", async () => {
    mocks.teachLessonAgain.mockResolvedValue({ runNumber: 2, closedAttempts: 3, skippedStudents: 2, auditFailed: true });
    await expect(teachLessonAgainAction(BOOK, 3)).resolves.toEqual({ success: true });
    expect(mocks.logWarn).toHaveBeenCalledWith("teach_again_students_skipped", expect.objectContaining({ classBookId: BOOK, skippedStudents: 2 }));
    expect(mocks.logError).toHaveBeenCalledWith("teach_again_audit_failed", expect.objectContaining({ classBookId: BOOK }));
  });

  it("logs nothing when no student is skipped and the audit write works", async () => {
    mocks.teachLessonAgain.mockResolvedValue({ runNumber: 2, closedAttempts: 3, skippedStudents: 0, auditFailed: false });
    await teachLessonAgainAction(BOOK, 3);
    expect(mocks.logWarn).not.toHaveBeenCalled();
    expect(mocks.logError).not.toHaveBeenCalled();
  });
});
