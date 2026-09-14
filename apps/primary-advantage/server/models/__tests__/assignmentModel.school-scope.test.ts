// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@reading-advantage/db", () => ({
  db: { select: mocks.select },
  classrooms: { id: "classrooms.id" },
  articles: { id: "articles.id" },
  assignments: { id: "assignments.id" },
  studentAssignments: { id: "studentAssignments.id" },
  lessonProgress: { id: "lessonProgress.id" },
  articleActivityLogs: { id: "articleActivityLogs.id" },
  sentencsAndWordsForFlashcards: { articleId: "sentencs.articleId" },
  multipleChoiceQuestions: { articleId: "mc.articleId" },
  shortAnswerQuestions: { articleId: "sa.articleId" },
  longAnswerQuestions: { articleId: "la.articleId" },
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
}));

import getAssignmentById from "../assignmentModel";

/**
 * Builds a chainable Drizzle stub resolving to rows.
 * @param value The rows returned when awaited.
 * @returns A stub with from/where/limit support.
 */
function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "where", "limit"]) {
    stub[method] = () => stub;
  }
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) =>
    Promise.resolve(value).then(resolve);
  return stub;
}

const assignment = {
  id: "assignment-1",
  classroomId: "class-a",
  articleId: "article-1",
};
const classroomA = { id: "class-a", schoolId: "school-a" };

/**
 * Primes the model selects for one assignment read.
 * @param classroom The classroom row joined to the assignment.
 * @param enrollments The caller's enrollment rows.
 */
function primeReads(
  classroom: Record<string, unknown>,
  enrollments: unknown[],
) {
  mocks.select
    .mockReturnValueOnce(chain([assignment]))
    .mockReturnValueOnce(chain([]))
    .mockReturnValueOnce(chain([classroom]))
    .mockReturnValueOnce(chain(enrollments));
}

describe("getAssignmentById school scope", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies a teacher reading another school's assignment", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "teacher-a",
      role: "TEACHER",
      schoolId: "school-a",
    });
    primeReads({ id: "class-b", schoolId: "school-b" }, []);

    await expect(getAssignmentById("assignment-1")).rejects.toThrow();
  });

  it("denies an unenrolled student", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "student-a",
      role: "STUDENT",
      schoolId: "school-a",
    });
    primeReads(classroomA, []);

    await expect(getAssignmentById("assignment-1")).rejects.toThrow();
  });

  it("serves a same-school teacher", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "teacher-a",
      role: "TEACHER",
      schoolId: "school-a",
    });
    primeReads(classroomA, []);

    const result = (await getAssignmentById("assignment-1")) as Record<
      string,
      unknown
    >;

    expect(result).toMatchObject({ id: "assignment-1" });
  });
});
