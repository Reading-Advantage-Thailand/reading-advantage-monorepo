import { describe, expect, it } from "vitest";

import type { TenantDB } from "../../db-contract.js";
import { createMockDb } from "../../__tests__/mock-db.js";
import {
  getLessonGameResults,
  lessonGameResultsRequestSchema,
  lessonGameResultsSchema,
} from "../lesson-results.js";
import { gameCompletionInputSchema } from "../schema.js";

const ARTICLE = "11111111-1111-4111-8111-111111111111";
const student = {
  id: "student-1",
  username: "s1",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A2",
};
const tenant = { schoolId: "school-1" };

const row = (gameType: string, correct: number, total: number, xp: number, at: string) => ({
  gameType,
  correctAnswers: correct,
  totalAttempts: total,
  xpEarned: xp,
  createdAt: new Date(at),
});

/** A TenantDB whose select returns the rows (newest first, as the query orders them). */
const dbOf = (rows: unknown[], closedAt: Date | null = null) =>
  createMockDb({ selectSequence: [[{ closedAt }], rows] }) as unknown as TenantDB;

describe("lessonGameResultsRequestSchema", () => {
  it("needs an article id and nothing else", () => {
    expect(lessonGameResultsRequestSchema.safeParse({ articleId: ARTICLE }).success).toBe(true);
    expect(lessonGameResultsRequestSchema.safeParse({ articleId: "x" }).success).toBe(false);
    expect(lessonGameResultsRequestSchema.safeParse({ articleId: ARTICLE, userId: "other" }).success).toBe(false);
  });
});

describe("getLessonGameResults", () => {
  it("returns the latest run of each game and the total XP of all runs", async () => {
    const db = dbOf([
      row("rune-match-story", 7, 10, 8, "2026-10-12T10:00:00Z"),
      row("rpg-battle-story", 8, 10, 9, "2026-10-12T09:00:00Z"),
      row("rune-match-story", 4, 10, 5, "2026-10-11T10:00:00Z"),
    ]);
    const result = await getLessonGameResults({ db, user: student, tenant, input: { articleId: ARTICLE } });
    expect(result.latest).toEqual([
      { gameId: "rune-match", correctAnswers: 7, totalAttempts: 10, xpEarned: 8, playedAt: "2026-10-12T10:00:00.000Z" },
      { gameId: "rpg-battle", correctAnswers: 8, totalAttempts: 10, xpEarned: 9, playedAt: "2026-10-12T09:00:00.000Z" },
    ]);
    expect(result.totalXp).toBe(22);
    expect(lessonGameResultsSchema.safeParse(result).success).toBe(true);
  });

  it("counts only the runs after the latest closed attempt of the article (M-16)", async () => {
    const db = dbOf(
      [
        row("rune-match-story", 7, 10, 8, "2026-10-12T10:00:00Z"),
        row("rpg-battle-story", 8, 10, 9, "2026-10-11T09:00:00Z"),
        row("rune-match-story", 4, 10, 5, "2026-10-11T10:00:00Z"),
      ],
      new Date("2026-10-12T00:00:00Z"),
    );
    const result = await getLessonGameResults({ db, user: student, tenant, input: { articleId: ARTICLE } });
    expect(result.totalXp).toBe(8);
    expect(result.latest.map((entry) => entry.gameId)).toEqual(["rune-match"]);
  });

  it("returns nothing for an article that has no run", async () => {
    const result = await getLessonGameResults({ db: dbOf([]), user: student, tenant, input: { articleId: ARTICLE } });
    expect(result).toEqual({ latest: [], totalXp: 0 });
  });

  it("ignores a row whose game type has no story suffix", async () => {
    const db = dbOf([row("rune-match", 7, 10, 8, "2026-10-12T10:00:00Z")]);
    const result = await getLessonGameResults({ db, user: student, tenant, input: { articleId: ARTICLE } });
    expect(result.latest).toEqual([]);
  });

  it("refuses a student of another school and a user with no school", async () => {
    await expect(
      getLessonGameResults({ db: dbOf([]), user: student, tenant: { schoolId: "school-2" }, input: { articleId: ARTICLE } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      getLessonGameResults({ db: dbOf([]), user: { ...student, schoolId: null }, tenant: { schoolId: null }, input: { articleId: ARTICLE } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("completion of a lesson game", () => {
  const body = (gameType: string) => ({
    gameType,
    difficulty: "medium",
    score: 100,
    accuracy: 0.8,
    correctAnswers: 8,
    totalAttempts: 10,
    duration: 40,
    victory: true,
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    clientTimestamp: 1_760_000_000_000,
    metadata: { articleId: ARTICLE },
  });

  it.each([
    "rpg-battle-story",
    "rune-match-story",
    "dragon-rider-story",
    "enchanted-library-story",
    "castle-defense-story",
    "potion-rush-story",
  ])("the route accepts the story run of %s with the article id", (gameType) => {
    const parsed = gameCompletionInputSchema.safeParse(body(gameType));
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.metadata?.articleId).toBe(ARTICLE);
  });

  it("the route refuses a client XP value", () => {
    expect(gameCompletionInputSchema.safeParse({ ...body("rune-match-story"), xp: 99 }).success).toBe(false);
  });
});
