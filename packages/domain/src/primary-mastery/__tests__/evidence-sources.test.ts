import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "../../__tests__/mock-db.js";
import { loadPrimaryEvidenceEvent } from "../evidence-sources.js";
import { ARTICLE, Q1, Q2, ROW, SCHOOL, STUDENT } from "./evidence-fixtures.js";

const db = (rows: unknown[]) => createMockDb({ selectResults: rows }) as unknown as DB;
const AT = new Date("2026-10-06T10:00:00.000Z");

describe("loadPrimaryEvidenceEvent (FR-5, FR-6)", () => {
  it("turns a user_activity row with the new details keys into a question-step event with the owner's school", async () => {
    const loaded = await loadPrimaryEvidenceEvent({
      db: db([{ id: ROW, userId: STUDENT, schoolId: SCHOOL, activityType: "MC_QUESTION", targetId: ARTICLE, createdAt: AT, details: { score: 1, responses: [], mode: "independent", audioPlayed: true, questions: [{ questionId: Q1, questionType: "mcq", correct: true, firstTry: true }] } }]),
      payload: { sourceTable: "user_activity", rowId: ROW },
    });
    expect(loaded).toEqual({
      schoolId: SCHOOL,
      event: { kind: "question-step", sourceTable: "user_activity", rowId: ROW, userId: STUDENT, articleId: ARTICLE, mode: "independent", questions: [{ questionId: Q1, questionType: "mcq", correct: true, firstTry: true }], audioPlayed: true, occurredAt: AT.toISOString() },
    });
  });

  it("rebuilds a legacy MCQ row (no question ids) by matching its question texts to the article's questions, at the teacher-led mode, counting the unmatched", async () => {
    const legacyRow = { id: ROW, userId: STUDENT, schoolId: SCHOOL, activityType: "MC_QUESTION", targetId: ARTICLE, createdAt: AT, details: { score: 1, timer: 30, responses: [
      { question: "What is in the box?", answer: "A puppy", isCorrect: "A puppy" },
      { question: "Who has a box? ", answer: "Tom", isCorrect: "Lily" },
      { question: "A question the bank replaced", answer: "x", isCorrect: "x" },
    ] } };
    const loaded = await loadPrimaryEvidenceEvent({
      db: createMockDb({ selectSequence: [[legacyRow], [{ id: Q1, question: "What is in the box?" }, { id: Q2, question: "Who has a box?" }]] }) as unknown as DB,
      payload: { sourceTable: "user_activity", rowId: ROW },
    });
    expect(loaded).toEqual({
      schoolId: SCHOOL,
      legacyUnmatched: 1,
      event: { kind: "question-step", sourceTable: "user_activity", rowId: ROW, userId: STUDENT, articleId: ARTICLE, mode: "teacher_led", questions: [
        { questionId: Q1, questionType: "mcq", correct: true, firstTry: true },
        { questionId: Q2, questionType: "mcq", correct: false, firstTry: true },
      ], occurredAt: AT.toISOString() },
    });
  });

  it("reads legacy details stored as a JSON string inside the jsonb column (the production shape)", async () => {
    const legacyRow = { id: ROW, userId: STUDENT, schoolId: SCHOOL, activityType: "MC_QUESTION", targetId: ARTICLE, createdAt: AT, details: JSON.stringify({ score: 1, responses: [{ question: "What is in the box?", answer: "A puppy", isCorrect: "A puppy" }] }) };
    const loaded = await loadPrimaryEvidenceEvent({
      db: createMockDb({ selectSequence: [[legacyRow], [{ id: Q1, question: "What is in the box?" }]] }) as unknown as DB,
      payload: { sourceTable: "user_activity", rowId: ROW },
    });
    expect(loaded?.event.kind === "question-step" && loaded.event.questions).toEqual([{ questionId: Q1, questionType: "mcq", correct: true, firstTry: true }]);
    expect(loaded?.legacyUnmatched).toBeUndefined();
  });

  it("rebuilds a legacy SAQ row from its question text and the reviewer score out of 5", async () => {
    const legacyRow = { id: ROW, userId: STUDENT, schoolId: SCHOOL, activityType: "SA_QUESTION", targetId: ARTICLE, createdAt: AT, details: { question: "Why is the puppy sad?", yourAnswer: "...", score: 3, feedback: "ok" } };
    const loaded = await loadPrimaryEvidenceEvent({
      db: createMockDb({ selectSequence: [[legacyRow], [{ id: Q2, question: "Why is the puppy sad?" }]] }) as unknown as DB,
      payload: { sourceTable: "user_activity", rowId: ROW },
    });
    expect(loaded?.event).toMatchObject({ mode: "teacher_led", questions: [{ questionId: Q2, questionType: "saq", scoreRatio: 0.6 }] });
    expect(loaded?.legacyUnmatched).toBeUndefined();
  });

  it("returns null for a user_activity row that is not a quiz", async () => {
    expect(await loadPrimaryEvidenceEvent({ db: db([{ id: ROW, userId: STUDENT, schoolId: SCHOOL, activityType: "VOCABULARY_FLASHCARDS", targetId: ARTICLE, createdAt: AT, details: {} }]), payload: { sourceTable: "user_activity", rowId: ROW } })).toBeNull();
  });

  it("turns a card_reviews row with its card and deck into a flashcard-review event", async () => {
    const loaded = await loadPrimaryEvidenceEvent({
      db: db([{ id: ROW, rating: 3, timeSpent: 4000, reviewedAt: AT, front: "puppy", sourceId: ARTICLE, userId: STUDENT, schoolId: SCHOOL }]),
      payload: { sourceTable: "card_reviews", rowId: ROW },
    });
    expect(loaded).toEqual({ schoolId: SCHOOL, event: { kind: "flashcard-review", sourceTable: "card_reviews", rowId: ROW, userId: STUDENT, articleId: ARTICLE, word: "puppy", rating: 3, timeSpentMs: 4000, occurredAt: AT.toISOString() } });
  });

  it("gives a card whose source is not an article a null articleId", async () => {
    const loaded = await loadPrimaryEvidenceEvent({
      db: db([{ id: ROW, rating: 1, timeSpent: null, reviewedAt: AT, front: "puppy", sourceId: "lesson-7", userId: STUDENT, schoolId: SCHOOL }]),
      payload: { sourceTable: "card_reviews", rowId: ROW },
    });
    expect(loaded?.event).toMatchObject({ kind: "flashcard-review", articleId: null, rating: 1 });
  });

  it("turns a game_completions row with story evidence into a game-run event, expedition when the game type says so", async () => {
    const evidence = { schemaVersion: 1, kind: "story-game", gameId: "expedition", inputId: "pip-1", level: "A1", seed: 1, durationMs: 1000, items: [{ itemId: "w-puppy", itemKind: "word", label: "puppy", attempts: 1, correctFirstTry: true, solved: true }], practice: [] };
    const loaded = await loadPrimaryEvidenceEvent({
      db: db([{ id: ROW, schoolId: SCHOOL, userId: STUDENT, gameType: "expedition-story", createdAt: AT, metadata: { learningEvidence: evidence, articleId: ARTICLE } }]),
      payload: { sourceTable: "game_completions", rowId: ROW },
    });
    expect(loaded).toEqual({ schoolId: SCHOOL, event: { kind: "game-run", sourceTable: "game_completions", rowId: ROW, userId: STUDENT, gameId: "expedition", articleId: ARTICLE, surface: "expedition", items: [{ itemId: "w-puppy", kind: "word", label: "puppy", attempts: 1, correctFirstTry: true, solved: true }], occurredAt: AT.toISOString() } });
  });

  it("returns null for a game completion without story evidence, and for a missing row", async () => {
    expect(await loadPrimaryEvidenceEvent({ db: db([{ id: ROW, schoolId: SCHOOL, userId: STUDENT, gameType: "word-hunt", createdAt: AT, metadata: { learningEvidence: { kind: "listening" } } }]), payload: { sourceTable: "game_completions", rowId: ROW } })).toBeNull();
    expect(await loadPrimaryEvidenceEvent({ db: db([]), payload: { sourceTable: "user_activity", rowId: ROW } })).toBeNull();
  });
});
