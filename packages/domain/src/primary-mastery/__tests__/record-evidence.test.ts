import { describe, expect, it } from "vitest";
import { createInMemoryMasteryPersistence } from "../../mastery/in-memory-mastery-persistence.js";
import { recordPrimaryEvidence } from "../record-evidence.js";
import { ARTICLE, L19_2, PUPPY, Q1, Q2, Q3, R10_2, R12_1, RUN, SCHOOL, STUDENT, flashcardEvent, gameEvent, questionEvent, sampleResolver } from "./evidence-fixtures.js";

function setup() {
  const persistence = createInMemoryMasteryPersistence();
  const resolver = sampleResolver();
  const record = (event: Parameters<typeof recordPrimaryEvidence>[0]["event"]) => recordPrimaryEvidence({ tenant: { schoolId: SCHOOL }, event, persistence, resolver });
  return { persistence, record };
}

describe("recordPrimaryEvidence (FR-3, FR-4)", () => {
  it("commits one practice.v1 command per objective of an MCQ at 0.8 with variantKey mcq", async () => {
    const { persistence, record } = setup();
    const result = await record(questionEvent());
    expect(result.skipped).toEqual([]);
    expect(result.committed).toEqual([
      expect.objectContaining({ itemId: Q1, objectiveId: R12_1, variantKey: "mcq", rating: "Good", confidence: 0.8, status: "applied" }),
      expect.objectContaining({ itemId: Q1, objectiveId: L19_2, variantKey: "mcq", rating: "Good", confidence: 0.8, status: "applied" }),
    ]);
    const snapshot = await persistence.readSnapshot({ schoolId: SCHOOL });
    expect(snapshot.evidence.map((row) => [row.studentId, row.objectiveId, row.variantKey])).toEqual([[STUDENT, R12_1, "mcq"], [STUDENT, L19_2, "mcq"]]);
    expect(snapshot.cards).toHaveLength(2);
    expect(snapshot.reviews.every((row) => row.beforeState && row.afterState)).toBe(true);
  });

  it("uses the teacher-led confidence and the hint step", async () => {
    const { record } = setup();
    const result = await record(questionEvent({ mode: "teacher_led", hintUsed: true }));
    expect(result.committed.map((row) => row.confidence)).toEqual([0.3, 0.3]);
  });

  it("replays on a second run: same receipts, nothing new written", async () => {
    const { persistence, record } = setup();
    const first = await record(questionEvent());
    const second = await record(questionEvent());
    expect(second.committed.map((row) => row.status)).toEqual(["replayed", "replayed"]);
    expect(second.committed.map((row) => row.commitId)).toEqual(first.committed.map((row) => row.commitId));
    expect((await persistence.readSnapshot({ schoolId: SCHOOL })).evidence).toHaveLength(2);
  });

  it("rates an SAQ by the score ratio and skips an untagged question with no-tag", async () => {
    const { record } = setup();
    const result = await record(questionEvent({ questions: [
      { questionId: Q2, questionType: "saq", scoreRatio: 0.6 },
      { questionId: Q3, questionType: "mcq", correct: true },
    ] }));
    expect(result.committed).toEqual([expect.objectContaining({ itemId: Q2, objectiveId: R10_2, variantKey: "saq", rating: "Hard", confidence: 0.7 })]);
    expect(result.skipped).toEqual([{ itemId: Q3, reason: "no-tag" }]);
  });

  it("skips a listening objective when the audio did not play and keeps the reading one", async () => {
    const { record } = setup();
    const result = await record(questionEvent({ audioPlayed: false }));
    expect(result.committed.map((row) => row.objectiveId)).toEqual([R12_1]);
    expect(result.skipped).toEqual([{ itemId: Q1, objectiveId: L19_2, reason: "listening-without-audio" }]);
  });

  it("records nothing for an LAQ and for a wrong answer that was blank", async () => {
    const { record } = setup();
    const result = await record(questionEvent({ questions: [
      { questionId: Q1, questionType: "laq", scoreRatio: 1 },
      { questionId: Q1, questionType: "mcq", correct: false, blank: true },
    ] }));
    expect(result.committed).toEqual([]);
    expect(result.skipped.map((row) => row.reason)).toEqual(["no-evidence", "blank"]);
  });

  it("commits a flashcard review against the word's node at 0.7 and skips an off-list word with no-tag", async () => {
    const { record } = setup();
    const puppy = await record(flashcardEvent());
    expect(puppy.committed).toEqual([expect.objectContaining({ itemId: "puppy", objectiveId: PUPPY, variantKey: "flashcard", rating: "Good", confidence: 0.7 })]);
    const mud = await record(flashcardEvent({ word: "mud" }));
    expect(mud.committed).toEqual([]);
    expect(mud.skipped).toEqual([{ itemId: "mud", reason: "no-tag" }]);
  });

  it("skips a flashcard with no source article with no-article", async () => {
    const { record } = setup();
    const result = await record(flashcardEvent({ articleId: null }));
    expect(result.skipped).toEqual([{ itemId: "puppy", reason: "no-article" }]);
  });

  it("commits game items at 0.4 with variantKey game:<gameId>: words by label with the stem rule, questions by text, sentences skipped", async () => {
    const { record } = setup();
    const result = await record(gameEvent());
    expect(result.committed).toEqual([
      expect.objectContaining({ itemId: "w-puppy", objectiveId: PUPPY, variantKey: "game:word-hunt", rating: "Good", confidence: 0.4 }),
      expect.objectContaining({ itemId: "w-run", objectiveId: RUN, variantKey: "game:word-hunt", rating: "Hard", confidence: 0.4 }),
      expect.objectContaining({ itemId: "q-1", objectiveId: R12_1, variantKey: "game:word-hunt", rating: "Good", confidence: 0.4 }),
      expect.objectContaining({ itemId: "q-1", objectiveId: L19_2, variantKey: "game:word-hunt", rating: "Good", confidence: 0.4 }),
    ]);
    expect(result.skipped).toEqual([
      { itemId: "w-mud", reason: "no-tag" },
      { itemId: "s-1", reason: "no-evidence" },
    ]);
  });

  it("uses variantKey expedition for the expedition and skips an unknown question item", async () => {
    const { record } = setup();
    const result = await record(gameEvent({ surface: "expedition", items: [{ itemId: "q-9", kind: "question", label: "Where is the dog?", attempts: 1, correctFirstTry: true, solved: true }] }));
    expect(result.committed).toEqual([]);
    expect(result.skipped).toEqual([{ itemId: "q-9", reason: "unknown-item" }]);
    const words = await record(gameEvent({ surface: "expedition", rowId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", items: [{ itemId: "w-puppy", kind: "word", label: "puppy", attempts: 1, correctFirstTry: true, solved: true }] }));
    expect(words.committed[0]).toMatchObject({ variantKey: "expedition" });
  });

  it("rejects a run of more than 200 items before any write", async () => {
    const { persistence, record } = setup();
    const items = Array.from({ length: 201 }, (_, index) => ({ itemId: `w-${index}`, kind: "word" as const, label: "puppy", attempts: 1, correctFirstTry: true, solved: true }));
    await expect(record(gameEvent({ items }))).rejects.toThrow(/200/);
    expect((await persistence.readSnapshot({ schoolId: SCHOOL })).evidence).toEqual([]);
  });

  it("never writes a word record or a card for a word outside the mastery tables", async () => {
    const { persistence, record } = setup();
    await record(flashcardEvent());
    const snapshot = await persistence.readSnapshot({ schoolId: SCHOOL });
    expect(snapshot.cards.map((card) => card.objectiveId)).toEqual([PUPPY]);
    expect(snapshot.evidence[0]).toMatchObject({ objectiveId: PUPPY, variantKey: "flashcard" });
    expect(ARTICLE).toBeTruthy();
  });

  it("stamps the review and the evidence with the time of the source row, not the run time", async () => {
    const { persistence, record } = setup();
    await record(questionEvent({ occurredAt: "2025-11-05T13:30:13.344Z" }));
    const snapshot = await persistence.readSnapshot({ schoolId: SCHOOL });
    expect(snapshot.reviews.map((row) => row.reviewedAt)).toEqual(["2025-11-05T13:30:13.344Z", "2025-11-05T13:30:13.344Z"]);
    expect(snapshot.evidence.map((row) => row.createdAt)).toEqual(["2025-11-05T13:30:13.344Z", "2025-11-05T13:30:13.344Z"]);
  });

  it("records an older row that runs after a newer one at the card's last review time", async () => {
    const { persistence, record } = setup();
    await record(questionEvent({ occurredAt: "2025-11-06T09:00:00.000Z" }));
    await record(questionEvent({ rowId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", occurredAt: "2025-11-04T09:00:00.000Z" }));
    const snapshot = await persistence.readSnapshot({ schoolId: SCHOOL });
    expect(snapshot.reviews.map((row) => row.reviewedAt)).toEqual(Array(4).fill("2025-11-06T09:00:00.000Z"));
  });
});
