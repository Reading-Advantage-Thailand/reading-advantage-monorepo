// @vitest-environment node
/**
 * Audit S5/S6: the vocabulary and sentences pages showed "Failed to fetch dashboard data".
 * getDashboardData filtered the activity type with sql`... = ANY(${array})`. Drizzle expands a JS
 * array in a sql template to a list, so Postgres got `= ANY(($1))` and failed with
 * 22P02 "malformed array literal" (one type) or 42809 "op ANY/ALL (array) requires array on
 * right side" (two types). This test renders the real where clauses with the Postgres dialect.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  results: [] as unknown[][],
  wheres: [] as unknown[],
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));

vi.mock("@/lib/fsrs-service", () => ({ fsrsService: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  /**
   * Builds a chainable select stub that records its where clause and resolves to the next result.
   * @returns The stub.
   */
  const select = () => {
    const rows = mocks.results.shift() ?? [];
    const stub: Record<string, unknown> = {};
    for (const method of ["from", "orderBy", "limit", "innerJoin", "leftJoin"]) {
      stub[method] = () => stub;
    }
    stub.where = (condition: unknown) => {
      mocks.wheres.push(condition);
      return stub;
    };
    stub.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve);
    return stub;
  };
  return { ...actual, db: { select } };
});

import { getDashboardData } from "../flashcard";

const dialect = new PgDialect();

/**
 * Renders the recorded where clauses that filter on the activity type.
 * @returns The SQL text and parameters of each clause.
 */
function activityTypeClauses() {
  return mocks.wheres
    .map((condition) => dialect.sqlToQuery(condition as SQL))
    .filter((query) => query.sql.includes("activity_type"));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.wheres.length = 0;
  mocks.currentUser.mockResolvedValue({ id: "student-1" });
});

describe("getDashboardData activity-type filter", () => {
  it("loads the vocabulary dashboard with a valid IN list for the activity type", async () => {
    const now = new Date();
    mocks.results.splice(0, mocks.results.length,
      [{ id: "deck-1", name: "Words", type: "VOCABULARY", createdAt: now, updatedAt: now }],
      [], // cards of deck-1
      [{ value: 3 }], // cards studied today
      [{ value: "40" }], // XP earned
      [{ createdAt: now }], // activity days for the streak
    );

    const result = await getDashboardData("VOCABULARY");

    expect(result.success).toBe(true);
    expect(result.stats).toMatchObject({ totalDecks: 1, cardsStudiedToday: 3, xpEarned: 40, streakDays: 1 });
    const clauses = activityTypeClauses();
    expect(clauses).toHaveLength(3);
    for (const clause of clauses) {
      expect(clause.sql).not.toMatch(/ANY\s*\(/i);
      expect(clause.sql).toMatch(/"activity_type" in \(\$\d+\)/);
      expect(clause.params).toContain("VOCABULARY_FLASHCARDS");
      expect(clause.params).not.toContain("SENTENCE_FLASHCARDS");
    }
  });

  it("filters on both flashcard activity types when no deck type is given", async () => {
    mocks.results.splice(0, mocks.results.length, [], [{ value: 0 }], [{ value: null }], []);

    const result = await getDashboardData();

    expect(result.success).toBe(true);
    const clauses = activityTypeClauses();
    expect(clauses).toHaveLength(3);
    for (const clause of clauses) {
      expect(clause.sql).not.toMatch(/ANY\s*\(/i);
      expect(clause.params).toEqual(expect.arrayContaining(["VOCABULARY_FLASHCARDS", "SENTENCE_FLASHCARDS"]));
    }
  });
});
