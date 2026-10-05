import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { awardPowerUps, goalMet, mcCounts, readGoalFacts, type GoalFacts } from "../goals.js";
import { POWER_UP_CAP_PER_WEEK } from "../rules.js";

const SCHOOL = "10000000-0000-4000-8000-000000000001";
const CLASS = "20000000-0000-4000-8000-000000000002";
const QUEST = "40000000-0000-4000-8000-000000000004";
const now = new Date("2026-10-08T03:00:00.000Z");
const student: UserContext = { id: "s1", username: "s1", name: "Som", role: "STUDENT", schoolId: SCHOOL, xp: 40, level: 1, cefrLevel: "A1" };
const questRow = {
  id: QUEST, schoolId: SCHOOL, classId: CLASS, templateId: "goblin-raid", challengeId: "30000000-0000-4000-8000-000000000003", status: "open", statusAt: now,
  startsAt: new Date("2026-10-04T17:00:00.000Z"), battleAt: new Date("2026-10-09T07:30:00.000Z"), bossTarget: 350, createdByUserId: "t1", createdAt: now,
};
const facts: GoalFacts = { readingDays: 3, accuracy: { correct: 16, total: 20 }, streakDays: 5, lessonSteps: 4 };
const db = (mock: unknown) => mock as DB;
const mc = (answers: [string, string][]) => ({ details: { responses: answers.map(([answer, isCorrect]) => ({ answer, isCorrect })) } });
const days = (...list: string[]) => list.map((day) => ({ day }));

describe("goalMet", () => {
  it("judges each goal kind against the facts", () => {
    expect(goalMet({ key: "a", kind: "reading-days", days: 3, powerUp: "shield" }, facts)).toBe(true);
    expect(goalMet({ key: "a", kind: "reading-days", days: 4, powerUp: "shield" }, facts)).toBe(false);
    expect(goalMet({ key: "b", kind: "accuracy", percent: 80, minQuestions: 20, powerUp: "sharp-blade" }, facts)).toBe(true);
    expect(goalMet({ key: "b", kind: "accuracy", percent: 81, minQuestions: 20, powerUp: "sharp-blade" }, facts)).toBe(false);
    expect(goalMet({ key: "b", kind: "accuracy", percent: 80, minQuestions: 21, powerUp: "sharp-blade" }, facts)).toBe(false);
    expect(goalMet({ key: "c", kind: "streak", days: 5, powerUp: "rally-horn" }, facts)).toBe(true);
    expect(goalMet({ key: "d", kind: "lesson-steps", steps: 5, powerUp: "rally-horn" }, facts)).toBe(false);
  });
  it("never meets an accuracy goal with no questions", () => {
    expect(goalMet({ key: "b", kind: "accuracy", percent: 1, minQuestions: 1, powerUp: "shield" }, { ...facts, accuracy: { correct: 0, total: 0 } })).toBe(false);
  });
});

describe("mcCounts", () => {
  it("counts a response as correct when the answer equals the stored correct text", () => {
    expect(mcCounts(mc([["a", "a"], ["b", "c"], ["d", "d"]]).details)).toEqual({ correct: 2, total: 3 });
    expect(mcCounts({ responses: [null, 4, { answer: null, isCorrect: null }] })).toEqual({ correct: 0, total: 3 });
    expect(mcCounts(null)).toEqual({ correct: 0, total: 0 });
    expect(mcCounts({ score: 5 })).toEqual({ correct: 0, total: 0 });
  });
});

describe("readGoalFacts", () => {
  it("reads the week's days, the multiple-choice accuracy, the streak, and the lesson steps", async () => {
    const mock = createMockDb({
      selectSequence: [days("2026-10-05", "2026-10-06", "2026-10-08"), [mc([["a", "a"], ["b", "b"]]), mc([["c", "x"]])], days("2026-10-08", "2026-10-07", "2026-10-06"), [{ total: 2 }]],
    });
    await expect(readGoalFacts(db(mock), "s1", questRow.startsAt, now)).resolves.toEqual({ readingDays: 3, accuracy: { correct: 2, total: 3 }, streakDays: 3, lessonSteps: 2 });
  });
});

describe("awardPowerUps", () => {
  const earned = (goalKey: string, powerUp: string) => ({ id: goalKey, schoolId: SCHOOL, questId: QUEST, userId: "s1", goalKey, powerUp, earnedAt: now, usedAt: null });

  it("grants one power-up per newly met goal and returns the full set", async () => {
    const mock = createMockDb({
      selectSequence: [
        [{ classId: CLASS }], [questRow], [earned("streak-5", "rally-horn")],
        days("2026-10-05", "2026-10-06", "2026-10-08"), [mc([["a", "a"], ["b", "b"]])], days("2026-10-08"), [{ total: 0 }],
        [earned("streak-5", "rally-horn"), earned("read-3-days", "shield")],
      ],
    });
    const result = await awardPowerUps({ db: db(mock), user: student, now });
    const values = mock.insert.mock.results[0]!.value.values.mock.calls[0]![0];
    expect(values).toEqual([{ schoolId: SCHOOL, questId: QUEST, userId: "s1", goalKey: "read-3-days", powerUp: "shield", earnedAt: now }]);
    expect(result.map((p) => p.powerUp)).toEqual(["rally-horn", "shield"]);
  });

  it("grants nothing when every goal is earned or the cap is reached, and nothing without a quest", async () => {
    const full = Array.from({ length: POWER_UP_CAP_PER_WEEK }, (_, i) => earned(`g${i}`, "shield"));
    const capped = createMockDb({ selectSequence: [[{ classId: CLASS }], [questRow], full] });
    await expect(awardPowerUps({ db: db(capped), user: student, now })).resolves.toHaveLength(POWER_UP_CAP_PER_WEEK);
    expect(capped.insert).not.toHaveBeenCalled();
    const none = createMockDb({ selectSequence: [[{ classId: CLASS }], [questRow], [], days(), [], days(), [{ total: 0 }]] });
    await expect(awardPowerUps({ db: db(none), user: student, now })).resolves.toEqual([]);
    expect(none.insert).not.toHaveBeenCalled();
    await expect(awardPowerUps({ db: db(createMockDb({ selectResults: [] })), user: student, now })).resolves.toEqual([]);
  });
});
