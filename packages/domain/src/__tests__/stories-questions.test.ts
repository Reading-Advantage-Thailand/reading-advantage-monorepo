import { describe, it, expect, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import {
  getChapterQuestions,
  gradeChapterMcq,
  retakeChapterMcq,
  resolveChapterWritten,
  getChapterWrittenQuestion,
} from "../stories/index.js";
import { createTenantDB } from "../db-contract.js";
import { createMockDb } from "./mock-db.js";

vi.mock("@reading-advantage/db/schema", () => ({
  stories: { id: "s.id", isPublic: "s.isPublic", raLevel: "s.raLevel" },
  chapters: { id: "ch.id", storyId: "ch.storyId", isPublic: "ch.isPublic" },
  userActivity: { userId: "ua.userId", activityType: "ua.type", targetId: "ua.target", completed: "ua.completed", details: "ua.details" },
  multipleChoiceQuestions: { id: "mc.id", chapterId: "mc.chapterId", order: "mc.order" },
  shortAnswerQuestions: { id: "sa.id", chapterId: "sa.chapterId", order: "sa.order" },
  longAnswerQuestions: { id: "la.id", chapterId: "la.chapterId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, type: "eq" })),
  and: vi.fn((...conds) => ({ type: "and", conds })),
  gte: vi.fn((col, val) => ({ col, val, type: "gte" })),
  lte: vi.fn((col, val) => ({ col, val, type: "lte" })),
  inArray: vi.fn((col, val) => ({ col, val, type: "inArray" })),
  like: vi.fn((col, val) => ({ col, val, type: "like" })),
  asc: vi.fn((col) => ({ col, type: "asc" })),
}));

const CH = "11111111-1111-4111-8111-111111111111";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const student = { id: "s1", role: "STUDENT" as const, schoolId: "school-1", level: 5 };
const teacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1", level: 1 };
const tenant = { schoolId: "school-1" };
const wrap = (db: ReturnType<typeof createMockDb>) => createTenantDB(db as unknown as DB, tenant);

const bank = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: id(i + 1),
    question: `Q${i + 1}`,
    options: ["a", "b", "c", "d"],
    answer: "b",
    correctAnswer: 1,
    textualEvidence: "Line 3",
    order: i,
  }));

describe("getChapterQuestions", () => {
  it("returns 5 random MCQ without an answer, plus one SAQ and one LAQ", async () => {
    const db = createMockDb({
      selectSequence: [
        [{ id: CH }],
        bank(10),
        [{ id: id(50), question: "SA?", sampleAnswer: "x" }],
        [{ id: id(60), question: "LA?" }],
        [],
      ],
    });
    const out = await getChapterQuestions({ db: wrap(db), user: student, tenant, input: { chapterId: CH } });
    expect(out.mcq).toHaveLength(5);
    expect(new Set(out.mcq.map((q) => q.id)).size).toBe(5);
    const text = JSON.stringify(out);
    expect(text).not.toContain("Line 3");
    expect(text).not.toContain("correctAnswer");
    expect(text).not.toContain("sampleAnswer");
    expect(out.mcq[0]).toEqual({ id: expect.any(String), question: expect.any(String), options: ["a", "b", "c", "d"] });
    expect(out.saq).toEqual({ id: id(50), question: "SA?" });
    expect(out.laq).toEqual({ id: id(60), question: "LA?" });
    expect(out.done).toEqual({ mc: false, sa: false, la: false });
  });

  it("picks the SAQ and the LAQ at random from all that exist", async () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const db = createMockDb({
      selectSequence: [
        [{ id: CH }],
        bank(10),
        [{ id: id(50), question: "SA1?" }, { id: id(51), question: "SA2?" }],
        [{ id: id(60), question: "LA1?" }, { id: id(61), question: "LA2?" }],
        [],
      ],
    });
    const out = await getChapterQuestions({ db: wrap(db), user: student, tenant, input: { chapterId: CH } });
    spy.mockRestore();
    expect(out.saq).toEqual({ id: id(51), question: "SA2?" });
    expect(out.laq).toEqual({ id: id(61), question: "LA2?" });
  });

  it("keeps a started chapter visible after a level-up", async () => {
    const db = createMockDb({
      selectSequence: [[], [{ id: CH, storyId: "st1" }], [{ id: CH }], [{ targetId: CH }], bank(10), [], [], []],
    });
    const out = await getChapterQuestions({ db: wrap(db), user: student, tenant, input: { chapterId: CH } });
    expect(out.chapterId).toBe(CH);
  });

  it("filters out chapters that are not public", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], bank(10), [], [], []] });
    await getChapterQuestions({ db: wrap(db), user: student, tenant, input: { chapterId: CH } });
    const where = db.select.mock.results[0].value.from.mock.results[0].value.innerJoin.mock.results[0].value.where.mock.calls[0][0] as { conds: { col: string }[] };
    expect(where.conds).toContainEqual({ col: "ch.isPublic", val: true, type: "eq" });
  });

  it("picks 5 of the 9 that exist for a chapter with 9 MCQ", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], bank(9), [], [], []] });
    const out = await getChapterQuestions({ db: wrap(db), user: student, tenant, input: { chapterId: CH } });
    expect(out.mcq).toHaveLength(5);
    expect(out.saq).toBeNull();
    expect(out.laq).toBeNull();
  });

  it("marks the finished kinds and gives the last MCQ score", async () => {
    const db = createMockDb({
      selectSequence: [
        [{ id: CH }],
        bank(10),
        [],
        [],
        [
          { activityType: "STORIES_MC_QUESTION", details: { score: 4 } },
          { activityType: "STORIES_SA_QUESTION", details: {} },
        ],
      ],
    });
    const out = await getChapterQuestions({ db: wrap(db), user: student, tenant, input: { chapterId: CH } });
    expect(out.done).toEqual({ mc: true, sa: true, la: false });
    expect(out.mcScore).toBe(4);
  });

  it("refuses a chapter that is not visible (unpublished or outside the level window)", async () => {
    const db = createMockDb({ selectSequence: [[]] });
    await expect(getChapterQuestions({ db: wrap(db), user: student, tenant, input: { chapterId: CH } })).rejects.toThrow(
      /not found/i,
    );
  });

  it("rejects a bad chapter id", async () => {
    const db = createMockDb({});
    await expect(getChapterQuestions({ db: wrap(db), user: student, tenant, input: { chapterId: "x" } })).rejects.toThrow();
  });
});

describe("gradeChapterMcq", () => {
  const five = bank(10);
  const answers = (right: number) =>
    five.slice(0, 5).map((q, i) => ({ questionId: q.id, answer: i < right ? "b" : "a" }));

  it("grades on the server: 4 of 5 correct gives 8 XP", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], five] });
    const out = await gradeChapterMcq({ db: wrap(db), user: student, tenant, input: { chapterId: CH, answers: answers(4) } });
    expect(out.score).toBe(4);
    expect(out.total).toBe(5);
    expect(out.xpEarned).toBe(8);
    expect(out.results[4]).toMatchObject({ correct: false, correctAnswer: "b", textualEvidence: "Line 3" });
  });

  it("gives 0 XP for 0 correct", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], five] });
    const out = await gradeChapterMcq({ db: wrap(db), user: student, tenant, input: { chapterId: CH, answers: answers(0) } });
    expect(out.xpEarned).toBe(0);
  });

  it("refuses a question id that is not in the chapter", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], five] });
    const bad = [...answers(5).slice(0, 4), { questionId: id(999), answer: "b" }];
    await expect(gradeChapterMcq({ db: wrap(db), user: student, tenant, input: { chapterId: CH, answers: bad } })).rejects.toThrow(/question/i);
  });

  it("refuses a repeated question id", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], five] });
    const dup = [...answers(5).slice(0, 4), answers(5)[0]];
    await expect(gradeChapterMcq({ db: wrap(db), user: student, tenant, input: { chapterId: CH, answers: dup } })).rejects.toThrow(/question/i);
  });

  it("refuses a submit with fewer answers than the quiz size", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], five] });
    await expect(
      gradeChapterMcq({ db: wrap(db), user: student, tenant, input: { chapterId: CH, answers: answers(5).slice(0, 2) } }),
    ).rejects.toThrow(/answers/i);
  });

  it("accepts 5 of a bank of 9", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], bank(9)] });
    const out = await gradeChapterMcq({ db: wrap(db), user: student, tenant, input: { chapterId: CH, answers: answers(5) } });
    expect(out.score).toBe(5);
    expect(out.xpEarned).toBe(10);
  });

  it("refuses a non-student", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], five] });
    await expect(gradeChapterMcq({ db: wrap(db), user: teacher, tenant, input: { chapterId: CH, answers: answers(5) } })).rejects.toThrow();
  });
});

describe("retakeChapterMcq", () => {
  it("gives 5 fresh questions without answers and keeps the XP before the first submit", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], bank(10), []] });
    const out = await retakeChapterMcq({ db: wrap(db), user: student, tenant, input: { chapterId: CH } });
    expect(out.mcq).toHaveLength(5);
    expect(new Set(out.mcq.map((q) => q.id)).size).toBe(5);
    expect(JSON.stringify(out)).not.toContain("Line 3");
    expect(out.xpAvailable).toBe(true);
  });

  it("gives a new score but no second XP after the first submit", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], bank(10), [{ activityType: "STORIES_MC_QUESTION" }]] });
    const out = await retakeChapterMcq({ db: wrap(db), user: student, tenant, input: { chapterId: CH } });
    expect(out.mcq).toHaveLength(5);
    expect(out.xpAvailable).toBe(false);
  });

  it("refuses a chapter that is not visible", async () => {
    const db = createMockDb({ selectSequence: [[]] });
    await expect(retakeChapterMcq({ db: wrap(db), user: student, tenant, input: { chapterId: CH } })).rejects.toThrow(
      /not found/i,
    );
  });

  it("refuses a non-student", async () => {
    const db = createMockDb({});
    await expect(retakeChapterMcq({ db: wrap(db), user: teacher, tenant, input: { chapterId: CH } })).rejects.toThrow();
  });
});

describe("resolveChapterWritten", () => {
  const base = { chapterId: CH, questionId: id(50) };

  it("pays the SA score, capped at 5", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], [], [{ id: id(50), question: "SA?", sampleAnswer: "ok" }]] });
    const out = await resolveChapterWritten({ db: wrap(db), user: student, tenant, input: { ...base, kind: "sa", answer: "cat", score: 99 } });
    expect(out).toEqual({ question: "SA?", suggestedAnswer: "ok", xpEarned: 5 });
  });

  it("pays the LA rubric total, capped at 25, and never below 0", async () => {
    const mk = () => createMockDb({ selectSequence: [[{ id: CH }], [], [{ id: id(50), question: "LA?" }]] });
    const long = "x".repeat(150);
    const a = await resolveChapterWritten({ db: wrap(mk()), user: student, tenant, input: { ...base, kind: "la", answer: long, score: 18 } });
    expect(a.xpEarned).toBe(18);
    const b = await resolveChapterWritten({ db: wrap(mk()), user: student, tenant, input: { ...base, kind: "la", answer: long, score: 400 } });
    expect(b.xpEarned).toBe(25);
    const c = await resolveChapterWritten({ db: wrap(mk()), user: student, tenant, input: { ...base, kind: "la", answer: long, score: -3 } });
    expect(c.xpEarned).toBe(0);
  });

  it("refuses an LA answer shorter than level x 30 characters", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], [{ id: id(50), question: "LA?" }]] });
    await expect(
      resolveChapterWritten({ db: wrap(db), user: student, tenant, input: { ...base, kind: "la", answer: "x".repeat(149), score: 10 } }),
    ).rejects.toThrow(/150/);
  });

  it("refuses a question that is not in the chapter", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], [], []] });
    await expect(
      resolveChapterWritten({ db: wrap(db), user: student, tenant, input: { ...base, kind: "sa", answer: "cat", score: 3 } }),
    ).rejects.toThrow(/question/i);
  });

  it("refuses a second SA submit for the chapter", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], [{ activityType: "STORIES_SA_QUESTION" }]] });
    await expect(
      resolveChapterWritten({ db: wrap(db), user: student, tenant, input: { ...base, kind: "sa", answer: "cat", score: 3 } }),
    ).rejects.toThrow(/already submitted/i);
  });

  it("refuses a second LA submit for the chapter", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], [{ activityType: "STORIES_LA_QUESTION" }]] });
    await expect(
      resolveChapterWritten({ db: wrap(db), user: student, tenant, input: { ...base, kind: "la", answer: "x".repeat(150), score: 10 } }),
    ).rejects.toThrow(/already submitted/i);
  });

  it("refuses a non-student", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], [{ id: id(50), question: "SA?" }]] });
    await expect(
      resolveChapterWritten({ db: wrap(db), user: teacher, tenant, input: { ...base, kind: "sa", answer: "cat", score: 3 } }),
    ).rejects.toThrow();
  });
});

describe("getChapterWrittenQuestion", () => {
  it("returns the question and the sample answer for the server feedback call", async () => {
    const db = createMockDb({ selectSequence: [[{ id: CH }], [{ id: id(50), question: "SA?", sampleAnswer: "ok" }]] });
    const out = await getChapterWrittenQuestion({ db: wrap(db), user: student, tenant, input: { chapterId: CH, kind: "sa", questionId: id(50) } });
    expect(out).toEqual({ question: "SA?", suggestedAnswer: "ok" });
  });
});
