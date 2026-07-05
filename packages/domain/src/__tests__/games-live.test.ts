import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterEach,
  afterAll,
} from "vitest";
import { sql } from "drizzle-orm";

// Restore the real tenant registry so TenantDB auto-scoping and the
// fail-closed FLAT/REFERENTIAL guards behave like production.
vi.unmock("../tenant-registry.js");

import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { recordGameCompletion } from "../games/mutations.js";
import { calculateGameXP } from "../games/xp.js";
import { schools, users, leaderboards } from "@reading-advantage/db/schema";
import type { Tenant } from "@reading-advantage/auth";

vi.mock("@reading-advantage/auth", () => ({
  assertCan: vi.fn(),
  AuthError: class AuthError extends Error {
    code = "FORBIDDEN";
  },
}));

const SCHOOL_A_ID = "11111111-1111-1111-1111-111111111111";
const SCHOOL_B_ID = "22222222-2222-2222-2222-222222222222";
const USER_A_ID = "user-a";
const USER_B_ID = "user-b";
const IDEMPOTENCY_KEY = "33333333-3333-3333-3333-333333333333";

function makeTenant(schoolId: string): Tenant {
  return { schoolId };
}

function makeUser(userId: string, schoolId: string) {
  return {
    id: userId,
    username: userId,
    name: `Student ${userId}`,
    role: "STUDENT" as const,
    schoolId,
    xp: 0,
    level: 1,
    cefrLevel: "A1",
  };
}

function makeGameCompletionInput(
  overrides: Partial<{
    gameType: string;
    difficulty: string;
    idempotencyKey: string;
  }> = {},
) {
  return {
    gameType: "haunted-library",
    difficulty: "medium",
    score: 42,
    accuracy: 5 / 6,
    correctAnswers: 5,
    totalAttempts: 6,
    duration: 12_345,
    victory: true,
    idempotencyKey: IDEMPOTENCY_KEY,
    clientTimestamp: 1_700_000_000_000,
    ...overrides,
  };
}

async function seedSchoolAndUser(
  harness: TestDb,
  schoolId: string,
  userId: string,
) {
  await harness.db.insert(schools).values({ id: schoolId, name: `School ${schoolId}` });
  await harness.db.insert(users).values({
    id: userId,
    username: userId,
    displayUsername: userId,
    name: `Student ${userId}`,
    schoolId,
  });
}

describe("Phase 4 tenant-safe persistence and leaderboards (live-DB)", () => {
  let harness: TestDb;

  beforeAll(async () => {
    harness = await createTestDb();
  }, 60_000);

  afterEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.close();
  });

  describe("4A — tenant isolation of gameCompletions", () => {
    it("school-B tenant cannot see school-A completions, but school-A can", async () => {
      const gameCompletionsModule = await import("@reading-advantage/db/schema");
      const gameCompletions = (gameCompletionsModule as Record<string, unknown>).gameCompletions;
      if (!gameCompletions) {
        throw new Error("gameCompletions table is not exported from @reading-advantage/db/schema — migration missing");
      }

      const queriesModule = await import("../games/queries.js");
      if (typeof queriesModule.getSchoolLeaderboard !== "function") {
        throw new Error("getSchoolLeaderboard is not exported from games/queries.js");
      }

      await seedSchoolAndUser(harness, SCHOOL_A_ID, USER_A_ID);
      await seedSchoolAndUser(harness, SCHOOL_B_ID, USER_B_ID);

      const activityId = `game:haunted-library:${IDEMPOTENCY_KEY}`;
      const xpEarned = calculateGameXP(makeGameCompletionInput());
      await harness.db.insert(gameCompletions as typeof leaderboards).values({
        schoolId: SCHOOL_A_ID,
        userId: USER_A_ID,
        gameType: "haunted-library",
        difficulty: "medium",
        score: 42,
        accuracy: 5 / 6,
        correctAnswers: 5,
        totalAttempts: 6,
        duration: 12_345,
        victory: true,
        xpEarned,
        activityId,
      } as any);

      const schoolARows = await queriesModule.getSchoolLeaderboard({
        db: harness.tenantDb(makeTenant(SCHOOL_A_ID)),
        user: makeUser(USER_A_ID, SCHOOL_A_ID),
        tenant: makeTenant(SCHOOL_A_ID),
        input: { gameType: "haunted-library", difficulty: "medium" },
      });

      // Positive control: school-A sees its own row.
      expect(
        schoolARows.length,
        `Leaderboard row count: ${schoolARows.length} (school-A, game-scoped) — expected 1`,
      ).toBe(1);
      expect(schoolARows[0]?.userId).toBe(USER_A_ID);

      const schoolBRows = await queriesModule.getSchoolLeaderboard({
        db: harness.tenantDb(makeTenant(SCHOOL_B_ID)),
        user: makeUser(USER_B_ID, SCHOOL_B_ID),
        tenant: makeTenant(SCHOOL_B_ID),
        input: { gameType: "haunted-library", difficulty: "medium" },
      });

      // Negative control: school-B cannot see school-A's completion.
      expect(
        schoolBRows.length,
        `Tenant leak: school-B leaderboard saw ${schoolBRows.length} school-A rows`,
      ).toBe(0);
    });
  });

  describe("4B — race-safe fire-once", () => {
    it("two concurrent completions with the same idempotencyKey result in exactly one insert", async () => {
      await seedSchoolAndUser(harness, SCHOOL_A_ID, USER_A_ID);

      const input = makeGameCompletionInput();
      const promise = () =>
        recordGameCompletion({
          db: harness.tenantDb(makeTenant(SCHOOL_A_ID)),
          user: makeUser(USER_A_ID, SCHOOL_A_ID),
          tenant: makeTenant(SCHOOL_A_ID),
          input,
        });

      const [first, second] = await Promise.all([promise(), promise()]);

      const successes = [first, second].filter((r) => !r.duplicate).length;
      const duplicates = [first, second].filter((r) => r.duplicate).length;

      expect(
        successes,
        `Successful insert count: ${successes} — expected exactly 1`,
      ).toBe(1);
      expect(
        duplicates,
        `Duplicate response count: ${duplicates} — expected exactly 1`,
      ).toBe(1);

      // The duplicate must report zero XP and the same stable activityId.
      const duplicate = first.duplicate ? first : second;
      expect(duplicate.xpEarned).toBe(0);
      expect(duplicate.activityId).toBe(`game:haunted-library:${IDEMPOTENCY_KEY}`);

      // Insert call count: 1 (verified against game_completions).
      const gameCompletionsModule = await import("@reading-advantage/db/schema");
      const gameCompletions = (gameCompletionsModule as Record<string, unknown>).gameCompletions;
      if (!gameCompletions) {
        throw new Error("gameCompletions table is not exported — cannot verify insert count");
      }
      const countResult = await harness.db.execute(
        sql.raw(
          `SELECT COUNT(*)::int AS count FROM game_completions WHERE activity_id = 'game:haunted-library:${IDEMPOTENCY_KEY}'`,
        ),
      );
      const count = Number((countResult.rows[0] as { count: unknown }).count);
      expect(
        count,
        `Insert call count: ${count} — expected exactly 1 in game_completions`,
      ).toBe(1);
    });
  });

  describe("4C — leaderboards.schoolId notNull", () => {
    it("rejects an insert without schoolId and accepts one with schoolId", async () => {
      await seedSchoolAndUser(harness, SCHOOL_A_ID, USER_A_ID);

      // Negative control: raw insert without schoolId must fail after migration.
      await expect(
        harness.db.insert(leaderboards).values({ details: {} }),
        "leaderboards.schoolId nullable — allowed an insert without schoolId",
      ).rejects.toThrow();

      // Positive control: TenantDB injects a valid schoolId and succeeds.
      await expect(
        harness
          .tenantDb(makeTenant(SCHOOL_A_ID))
          .insert(leaderboards)
          .values({ details: {} }),
      ).resolves.not.toThrow();
    });

    it("TenantDB fails closed when tenant.schoolId is null", async () => {
      await expect(
        (async () => {
          await harness
            .tenantDb({ schoolId: "" })
            .insert(leaderboards)
            .values({ details: {} });
        })(),
      ).rejects.toThrow();
    });
  });

  describe("4E — getSchoolLeaderboard server-backed query", () => {
    it("returns only school-A rows scoped by TenantDB", async () => {
      const gameCompletionsModule = await import("@reading-advantage/db/schema");
      const gameCompletions = (gameCompletionsModule as Record<string, unknown>).gameCompletions;
      if (!gameCompletions) {
        throw new Error("gameCompletions table is not exported — getSchoolLeaderboard cannot run");
      }

      const queriesModule = await import("../games/queries.js");
      if (typeof queriesModule.getSchoolLeaderboard !== "function") {
        throw new Error("getSchoolLeaderboard is not exported from games/queries.js");
      }

      const schoolAUsers = ["a-1", "a-2", "a-3"];
      const schoolBUsers = ["b-1", "b-2"];

      await seedSchoolAndUser(harness, SCHOOL_A_ID, SCHOOL_A_ID);
      await seedSchoolAndUser(harness, SCHOOL_B_ID, SCHOOL_B_ID);

      for (const userId of schoolAUsers) {
        await seedSchoolAndUser(harness, SCHOOL_A_ID, userId);
        await harness.db.insert(gameCompletions as typeof leaderboards).values({
          schoolId: SCHOOL_A_ID,
          userId,
          gameType: "haunted-library",
          difficulty: "medium",
          score: 10,
          accuracy: 0.8,
          correctAnswers: 4,
          totalAttempts: 5,
          duration: 5000,
          victory: true,
          xpEarned: 5,
          activityId: `game:haunted-library:${userId}`,
        } as any);
      }

      for (const userId of schoolBUsers) {
        await seedSchoolAndUser(harness, SCHOOL_B_ID, userId);
        await harness.db.insert(gameCompletions as typeof leaderboards).values({
          schoolId: SCHOOL_B_ID,
          userId,
          gameType: "haunted-library",
          difficulty: "medium",
          score: 10,
          accuracy: 0.8,
          correctAnswers: 4,
          totalAttempts: 5,
          duration: 5000,
          victory: true,
          xpEarned: 5,
          activityId: `game:haunted-library:${userId}`,
        } as any);
      }

      const rows = await queriesModule.getSchoolLeaderboard({
        db: harness.tenantDb(makeTenant(SCHOOL_A_ID)),
        user: makeUser(schoolAUsers[0]!, SCHOOL_A_ID),
        tenant: makeTenant(SCHOOL_A_ID),
        input: { gameType: "haunted-library", difficulty: "medium" },
      });

      expect(
        rows.length,
        `Leaderboard row count: ${rows.length} (school-A, game-scoped) — expected 3`,
      ).toBe(3);

      const returnedUserIds = new Set(rows.map((r) => r.userId));
      for (const userId of schoolAUsers) {
        expect(returnedUserIds.has(userId)).toBe(true);
      }
      for (const userId of schoolBUsers) {
        expect(returnedUserIds.has(userId)).toBe(false);
      }
    });
  });
});
