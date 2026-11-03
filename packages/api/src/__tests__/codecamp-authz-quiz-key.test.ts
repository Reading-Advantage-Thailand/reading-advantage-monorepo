/**
 * Finding 3 of `authz-codecamp-report.md`: `codecamp.submitQuiz` must not
 * return the answer key on a failed attempt.
 *
 * The real router and domain run; only the database is a fake.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeDb, learnerContext, LESSON_ID, MODULE_ID, Q1, Q2 } from "./codecamp-authz-fakes.js";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { codecampRouter } from "../routers/codecamp.js";

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: vi.fn(() => ({ generateObject: vi.fn(), generateImage: vi.fn(), generateText: vi.fn() })),
  createAIClient: vi.fn(() => ({ generateObject: vi.fn(), generateImage: vi.fn(), generateText: vi.fn() })),
}));

const t = initTRPC.create({ transformer: superjson });
const appRouter = t.router({ codecamp: codecampRouter });

/**
 * Creates a tRPC caller signed in as a learner.
 * @param tenantDb The fake tenant DB for this test.
 * @returns A caller for the codecamp router.
 */
function learnerCaller(tenantDb: unknown) {
  return t.createCallerFactory(appRouter)(learnerContext(tenantDb));
}

describe("finding 3: codecamp.submitQuiz does not return the answer key on a failed attempt", () => {
  const quizRows = [
    { id: Q1, lessonId: LESSON_ID, question: "Q1?", options: ["a", "b"], correctAnswer: "a", explanation: "E1", order: 1 },
    { id: Q2, lessonId: LESSON_ID, question: "Q2?", options: ["c", "d"], correctAnswer: "d", explanation: "E2", order: 2 },
  ];
  const lessonRow = { id: LESSON_ID, moduleId: MODULE_ID, type: "quiz" };
  let db: ReturnType<typeof createFakeDb>;

  beforeEach(() => {
    db = createFakeDb({ codecamp_quiz_questions: quizRows, codecamp_lessons: [lessonRow] });
  });

  it("returns no correctAnswer for any question after a blank attempt", async () => {
    const result = await learnerCaller(db.tenantDb).codecamp.submitQuiz({
      lessonId: LESSON_ID,
      answers: [{ questionId: Q1, answer: "" }, { questionId: Q2, answer: "" }],
    });

    expect(result.score).toBe(0);
    expect(result.details.map((d) => d.correctAnswer), "no answer key after a failed attempt").toEqual(["", ""]);
  });

  it("reveals only the answers the learner got right on a failed attempt", async () => {
    const result = await learnerCaller(db.tenantDb).codecamp.submitQuiz({
      lessonId: LESSON_ID,
      answers: [{ questionId: Q1, answer: "a" }, { questionId: Q2, answer: "c" }],
    });

    expect(result.score).toBe(50);
    expect(result.details.find((d) => d.questionId === Q1)?.correctAnswer).toBe("a");
    expect(result.details.find((d) => d.questionId === Q2)?.correctAnswer).toBe("");
    expect(result.details.find((d) => d.questionId === Q2)?.isCorrect).toBe(false);
  });

  it("reveals every answer after a passing attempt", async () => {
    const result = await learnerCaller(db.tenantDb).codecamp.submitQuiz({
      lessonId: LESSON_ID,
      answers: [{ questionId: Q1, answer: "a" }, { questionId: Q2, answer: "d" }],
    });

    expect(result.score).toBe(100);
    expect(result.details.map((d) => d.correctAnswer)).toEqual(["a", "d"]);
  });
});
