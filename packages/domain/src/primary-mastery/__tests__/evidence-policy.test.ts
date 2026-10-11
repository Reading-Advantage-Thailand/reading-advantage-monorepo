import { describe, expect, it } from "vitest";
import { EVIDENCE_POLICY, MIN_ANSWER_MS, evidencePolicyRow, evidencePolicySchema, rateEvidence } from "../evidence-policy.js";

const independent = { mode: "independent" as const };
const teacherLed = { mode: "teacher_led" as const };

describe("evidence policy (FR-1, program 4.2)", () => {
  it("is a valid versioned policy with one row per surface", () => {
    expect(evidencePolicySchema.safeParse(EVIDENCE_POLICY).success).toBe(true);
    expect(EVIDENCE_POLICY.version).toBe("primary-evidence.v1");
    expect(new Set(EVIDENCE_POLICY.rows.map((row) => row.surface)).size).toBe(EVIDENCE_POLICY.rows.length);
    expect(evidencePolicyRow("mcq")).toMatchObject({ confidence: 0.8, teacherLedConfidence: 0.5, countsTowardMastered: true });
    expect(evidencePolicyRow("game")).toMatchObject({ confidence: 0.4, countsTowardMastered: false });
  });

  it("rates an MCQ Good on a first-try correct answer at 0.8, and Again when wrong", () => {
    expect(rateEvidence("mcq", { correct: true }, independent)).toEqual({ kind: "evidence", rating: "Good", confidence: 0.8, countsTowardMastered: true, hintUsed: false });
    expect(rateEvidence("mcq", { correct: false }, independent)).toMatchObject({ kind: "evidence", rating: "Again", confidence: 0.8 });
  });

  it("lowers a teacher-led MCQ to 0.5", () => {
    expect(rateEvidence("mcq", { correct: true }, teacherLed)).toMatchObject({ confidence: 0.5 });
  });

  it("lowers the confidence one step on a hint: 0.8 to 0.5, 0.5 to 0.3, 0.3 stays", () => {
    expect(rateEvidence("mcq", { correct: true }, { ...independent, hintUsed: true })).toMatchObject({ confidence: 0.5, hintUsed: true });
    expect(rateEvidence("mcq", { correct: true }, { ...teacherLed, hintUsed: true })).toMatchObject({ confidence: 0.3 });
    expect(rateEvidence("cloze", { correctRatio: 1 }, { ...independent, hintUsed: true })).toMatchObject({ confidence: 0.3 });
  });

  it("rates an SAQ by the score ratio: 1.0 Good, 0.5 to 0.9 Hard, under 0.5 Again, at 0.7", () => {
    expect(rateEvidence("saq", { scoreRatio: 1 }, independent)).toMatchObject({ rating: "Good", confidence: 0.7 });
    expect(rateEvidence("saq", { scoreRatio: 0.6 }, independent)).toMatchObject({ rating: "Hard" });
    expect(rateEvidence("saq", { scoreRatio: 0.4 }, independent)).toMatchObject({ rating: "Again" });
  });

  it("passes the flashcard rating through at 0.7 and counts it", () => {
    expect(rateEvidence("flashcard", { rating: 4 }, independent)).toMatchObject({ rating: "Good", confidence: 0.7, countsTowardMastered: true });
    expect(rateEvidence("flashcard", { rating: 2 }, independent)).toMatchObject({ rating: "Hard" });
    expect(rateEvidence("flashcard", { rating: 1 }, independent)).toMatchObject({ rating: "Again" });
  });

  it("rates a game item Good on the first try, Hard after a retry, Again when unsolved, at 0.4 and never counting", () => {
    expect(rateEvidence("game", { correctFirstTry: true, solved: true }, independent)).toMatchObject({ rating: "Good", confidence: 0.4, countsTowardMastered: false });
    expect(rateEvidence("expedition", { correctFirstTry: false, solved: true }, independent)).toMatchObject({ rating: "Hard", confidence: 0.4 });
    expect(rateEvidence("game", { correctFirstTry: false, solved: false }, independent)).toMatchObject({ rating: "Again" });
  });

  it("records nothing for an LAQ", () => {
    expect(rateEvidence("laq", { scoreRatio: 1 }, independent)).toEqual({ kind: "skip", reason: "no-evidence" });
  });

  it("records nothing for a blank answer or an answer under two seconds", () => {
    expect(rateEvidence("mcq", { correct: true, blank: true }, independent)).toEqual({ kind: "skip", reason: "blank" });
    expect(rateEvidence("mcq", { correct: true, answerMs: MIN_ANSWER_MS - 1 }, independent)).toEqual({ kind: "skip", reason: "too-fast" });
    expect(rateEvidence("mcq", { correct: true, answerMs: MIN_ANSWER_MS }, independent)).toMatchObject({ kind: "evidence" });
  });

  it("skips a listening objective when the audio is reported not played, and keeps it when it played or when the row does not say", () => {
    expect(rateEvidence("mcq", { correct: true }, { ...independent, objectiveSkill: "Listening", audioPlayed: false })).toEqual({ kind: "skip", reason: "listening-without-audio" });
    expect(rateEvidence("mcq", { correct: true }, { ...independent, objectiveSkill: "Listening" })).toMatchObject({ kind: "evidence" });
    expect(rateEvidence("mcq", { correct: true }, { ...independent, objectiveSkill: "Listening", audioPlayed: true })).toMatchObject({ kind: "evidence" });
    expect(rateEvidence("mcq", { correct: true }, { ...independent, objectiveSkill: "Reading" })).toMatchObject({ kind: "evidence" });
  });
});
