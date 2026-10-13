// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reads: vi.fn(),
  currentUser: vi.fn(),
  listCards: vi.fn(),
  getAssignmentActivityById: vi.fn(),
  getStudentAssignments: vi.fn(),
}));

/** A chain that counts each select and resolves to no rows. */
const chain: unknown = new Proxy(function () {}, {
  get: (_t, prop) => (prop === "then" ? (res: (v: unknown) => void) => res([]) : chain),
  apply: () => chain,
});

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@reading-advantage/db", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  db: { select: (...a: unknown[]) => (mocks.reads(...a), chain) },
}));
vi.mock("@reading-advantage/domain/games", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listPrimaryArticleCards: mocks.listCards,
}));
vi.mock("@/server/models/assignmentModel", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAssignmentActivityById: mocks.getAssignmentActivityById,
  getStudentAssignments: mocks.getStudentAssignments,
}));

import { getLessonSummaryData } from "../article";
import { getLessonFlashcards } from "../flashcard";
import { fetchAssignmentActivityById } from "@/server/controllers/assignmentController";
import { FlashcardType } from "@/types/enum";

const staff = { id: "t1", role: "TEACHER", schoolId: "school-1" };
const student = { id: "s1", role: "STUDENT", schoolId: "school-1" };
const ARTICLE = "11111111-1111-4111-8111-111111111111";

describe("staff preview reads the empty model, never the own student rows of the staff member", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue(staff);
  });

  it("the lesson summary", async () => {
    const result = await getLessonSummaryData(ARTICLE);
    expect(result).toEqual({ success: true, data: { totalXp: 0, gameXp: 0, attemptNumber: 1, quizScores: { mcqScore: 0, saqScore: 0 } } });
    expect(mocks.reads).not.toHaveBeenCalled();
  });

  it("the lesson flashcards of the 2D games", async () => {
    const result = await getLessonFlashcards(ARTICLE, FlashcardType.VOCABULARY);
    expect(result).toEqual({ success: true, cards: [] });
    expect(mocks.listCards).not.toHaveBeenCalled();
  });

  it("the assignment activity route", async () => {
    const response = await fetchAssignmentActivityById({} as never, { params: Promise.resolve({ id: ARTICLE }) });
    expect(await response.json()).toEqual({ assignmentActivity: null });
    expect(mocks.getAssignmentActivityById).not.toHaveBeenCalled();
  });

  it("a student still reads the own rows of the flashcards", async () => {
    mocks.currentUser.mockResolvedValue(student);
    mocks.listCards.mockResolvedValue([{ id: "c1" }]);
    expect(await getLessonFlashcards(ARTICLE, FlashcardType.VOCABULARY)).toEqual({ success: true, cards: [{ id: "c1" }] });
    mocks.getAssignmentActivityById.mockResolvedValue({ id: "x" });
    const response = await fetchAssignmentActivityById({} as never, { params: Promise.resolve({ id: ARTICLE }) });
    expect(await response.json()).toEqual({ assignmentActivity: { id: "x" } });
  });
});
