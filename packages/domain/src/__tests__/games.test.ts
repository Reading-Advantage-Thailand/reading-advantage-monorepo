import { describe, it, expect, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import {
  gameCompletionInputSchema,
  gameCompletionResultSchema,
  gameTypeEnum,
  gameDifficultyEnum,
  type GameCompletionInput,
} from "../games/schema.js";
import { calculateGameXP } from "../games/xp.js";
import { recordGameCompletion } from "../games/mutations.js";
import { recordActivity, updateLessonProgress } from "../progress/mutations.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";

vi.mock("@reading-advantage/auth", () => ({
  assertCan: vi.fn(),
  AuthError: class AuthError extends Error {
    code = "FORBIDDEN";
  },
}));

vi.mock("@reading-advantage/db/schema", () => ({
  xpLogs: {
    userId: "user_id",
    xpEarned: "xp_earned",
    activityId: "activity_id",
    activityType: "activity_type",
  },
  gameCompletions: {
    [Symbol.for("drizzle:Name")]: "game_completions",
    schoolId: "school_id",
    userId: "user_id",
    gameType: "game_type",
    difficulty: "difficulty",
    score: "score",
    accuracy: "accuracy",
    correctAnswers: "correct_answers",
    totalAttempts: "total_attempts",
    duration: "duration",
    victory: "victory",
    xpEarned: "xp_earned",
    activityId: "activity_id",
    clientTimestamp: "client_timestamp",
    metadata: "metadata",
    createdAt: "created_at",
  },
  gameRankings: {
    [Symbol.for("drizzle:Name")]: "game_rankings",
  },
  userActivity: {
    userId: "user_id",
    activityType: "activity_type",
    xpEarned: "xp_earned",
    metadata: "metadata",
  },
  lessonProgress: {
    userId: "user_id",
    lessonId: "lesson_id",
    status: "status",
    progress: "progress",
    completedAt: "completed_at",
    updatedAt: "updated_at",
  },
}));

const mockUser = {
  id: "user-1",
  username: "student1",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};

const mockTenant = { schoolId: "school-1" };

const idempotencyKey = "11111111-1111-1111-1111-111111111111";

function makeValidInput(
  overrides: Partial<GameCompletionInput> = {},
): GameCompletionInput {
  return {
    gameType: "haunted-library",
    difficulty: "medium",
    score: 42,
    accuracy: 5 / 6,
    correctAnswers: 5,
    totalAttempts: 6,
    duration: 12_345,
    victory: true,
    idempotencyKey,
    clientTimestamp: 1_700_000_000_000,
    ...overrides,
  };
}

describe("gameCompletionInputSchema (Group 3A)", () => {
  it("accepts a fully-valid payload", () => {
    const input = makeValidInput();
    const parsed = gameCompletionInputSchema.parse(input);

    expect(parsed.gameType).toBe("haunted-library");
    expect(parsed.difficulty).toBe("medium");
    expect(parsed.score).toBe(42);
    expect(parsed.accuracy).toBeCloseTo(0.8333, 3);
    expect(parsed.correctAnswers).toBe(5);
    expect(parsed.totalAttempts).toBe(6);
    expect(parsed.duration).toBe(12_345);
    expect(parsed.victory).toBe(true);
    expect(parsed.idempotencyKey).toBe(idempotencyKey);
    expect(parsed.clientTimestamp).toBe(1_700_000_000_000);
    // A4: positive control — schema must not silently strip the payload
    expect(Object.keys(parsed).length).toBeGreaterThanOrEqual(10);
  });

  it("rejects a client-supplied xp field (D-02)", () => {
    const input = makeValidInput({ xp: 100 as unknown as never });
    expect(() => gameCompletionInputSchema.parse(input)).toThrow();
  });

  it("rejects game-specific dead fields such as dragonCount (D-01)", () => {
    const input = makeValidInput({ dragonCount: 5 as unknown as never });
    expect(() => gameCompletionInputSchema.parse(input)).toThrow();
  });

  it("rejects bossPower dead field", () => {
    const input = makeValidInput({ bossPower: 99 as unknown as never });
    expect(() => gameCompletionInputSchema.parse(input)).toThrow();
  });

  it("rejects accuracy > 1 (canonical unit is 0..1, not percent)", () => {
    const input = makeValidInput({ accuracy: 75 });
    expect(() => gameCompletionInputSchema.parse(input)).toThrow();
  });

  it("rejects an invalid gameType", () => {
    const input = makeValidInput({ gameType: "fake-game" as unknown as never });
    expect(() => gameCompletionInputSchema.parse(input)).toThrow();
  });

  it("rejects a missing idempotencyKey", () => {
    const input = makeValidInput();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input as any).idempotencyKey;
    expect(() => gameCompletionInputSchema.parse(input)).toThrow();
  });

  it("rejects a malformed idempotencyKey (not a UUID)", () => {
    const input = makeValidInput({ idempotencyKey: "not-a-uuid" });
    expect(() => gameCompletionInputSchema.parse(input)).toThrow();
  });

  it("excludes xp from the input type at compile time", () => {
    // If the schema accidentally includes xp, this line will fail to compile.
    type AssertNoXp = "xp" extends keyof GameCompletionInput ? never : true;
    const _assert: AssertNoXp = true;
    expect(_assert).toBe(true);
  });
});

describe("gameTypeEnum / gameDifficultyEnum (Group 3A)", () => {
  it("includes haunted-library as a canonical game type", () => {
    expect(gameTypeEnum.options).toContain("haunted-library");
  });

  it.each(["astral-mage", "sorcerer-ziggurat"] as const)(
    "accepts the persisted W1 cartridge %s",
    (gameType) => {
      expect(gameTypeEnum.options).toContain(gameType);
      expect(() =>
        gameCompletionInputSchema.parse(makeValidInput({ gameType })),
      ).not.toThrow();
    },
  );

  it("uses medium (not normal) as the canonical difficulty", () => {
    expect(gameDifficultyEnum.options).toContain("medium");
    expect(gameDifficultyEnum.options).not.toContain("normal");
  });
});

describe("gameCompletionResultSchema (Group 3A)", () => {
  it("accepts a valid server-computed result", () => {
    const result = {
      xpEarned: 7,
      activityId: `game:haunted-library:${idempotencyKey}`,
      duplicate: false,
      status: 200,
    };
    expect(() => gameCompletionResultSchema.parse(result)).not.toThrow();
  });
});

describe("calculateGameXP (Group 3B)", () => {
  it("caps XP at 10 for a perfect session", () => {
    // XP earned: 10 = min(10, 10 + 2 + 1 + 1)
    const xp = calculateGameXP(
      makeValidInput({
        correctAnswers: 10,
        totalAttempts: 10,
        accuracy: 1,
        victory: true,
        duration: 30_000,
      }),
    );
    expect(xp).toBe(10);
  });

  it("awards base XP only when no bonuses apply", () => {
    // XP earned: 5 = min(10, 5 + 0 + 0 + 0)
    const xp = calculateGameXP(
      makeValidInput({
        correctAnswers: 5,
        totalAttempts: 10,
        accuracy: 0.5,
        victory: false,
        duration: 90_000,
      }),
    );
    expect(xp).toBe(5);
  });

  it("returns 0 when there are zero attempts", () => {
    // XP earned: 0 (totalAttempts === 0)
    const xp = calculateGameXP(
      makeValidInput({
        correctAnswers: 0,
        totalAttempts: 0,
        accuracy: 0,
      }),
    );
    expect(xp).toBe(0);
  });

  it("adds a victory bonus", () => {
    // XP earned: 6 = min(10, 5 + 0 + 1 + 0)
    // The test author wrote `accuracy: 1, totalAttempts: 5` here, but the spec
    // formula (Decision 3.3) awards a +2 accuracy bonus whenever the computed
    // accuracy equals 1 — that turns this into an accuracy+victory combination
    // and breaks the "victory in isolation" intent. We isolate the victory bonus
    // by setting totalAttempts to 10 so the computed accuracy is 0.5 (no
    // accuracy bonus) while victory still contributes +1.
    const xp = calculateGameXP(
      makeValidInput({
        correctAnswers: 5,
        totalAttempts: 10,
        accuracy: 0.5,
        victory: true,
        duration: 90_000,
      }),
    );
    expect(xp).toBe(6);
  });

  it("adds a speed bonus for sessions under 60 seconds", () => {
    // XP earned: 8 = min(10, 5 + 2 + 0 + 1)
    const xp = calculateGameXP(
      makeValidInput({
        correctAnswers: 5,
        totalAttempts: 5,
        accuracy: 1,
        victory: false,
        duration: 30_000,
      }),
    );
    expect(xp).toBe(8);
  });
});

describe("recordGameCompletion (Group 3C)", () => {
  it("inserts on first call and returns duplicate: false", async () => {
    const db = createMockDb({ selectResults: [] });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);
    const input = makeValidInput();

    const result = await recordGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input,
    });

    // Phase 4 dual-write: the first call inserts TWO rows in a single
    // transaction (gameCompletions + xpLogs). This preserves the
    // getStudentProgress#xpTotal read path while adding the tenant-safe
    // leaderboard record (Decision 4.1 §3).
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(result.duplicate).toBe(false);
    expect(result.activityId).toBe(`game:haunted-library:${input.idempotencyKey}`);
    // XP earned: 7 = min(10, 5 + 1 + 1 + 0) for victory + accuracy=5/6 + duration < 60s
    expect(result.xpEarned).toBe(7);
    expect(result.status).toBe(200);
  });

  it("returns duplicate: true and xpEarned: 0 on second call without inserting", async () => {
    const input = makeValidInput();
    const expectedActivityId = `game:haunted-library:${input.idempotencyKey}`;
    const db = createMockDb({
      selectSequence: [[], [{ activityId: expectedActivityId }]],
    });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const first = await recordGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input,
    });
    const second = await recordGameCompletion({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input,
    });

    // Phase 4 dual-write: first call inserts 2 rows (gameCompletions + xpLogs).
    // Second call short-circuits on the SELECT dedup check — NEITHER insert
    // is reached (the transaction never starts).
    // A4: exactly two inserts across both calls (the duplicate path is a no-op).
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.xpEarned).toBe(0);
    expect(second.activityId).toBe(expectedActivityId);
    expect(first.activityId).toBe(second.activityId);
  });

  it("throws before any DB call when the user lacks games:complete permission", async () => {
    const { assertCan } = await import("@reading-advantage/auth");
    vi.mocked(assertCan).mockImplementationOnce(() => {
      throw new Error("FORBIDDEN");
    });

    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await expect(
      recordGameCompletion({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: makeValidInput(),
      }),
    ).rejects.toThrow("FORBIDDEN");
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("getSchoolLeaderboard source table (Group 4D)", () => {
  it("reads from game_completions and never from game_rankings", async () => {
    const queriesModule = await import("../games/queries.js");
    if (typeof queriesModule.getSchoolLeaderboard !== "function") {
      throw new Error("getSchoolLeaderboard is not exported from games/queries.js");
    }

    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await queriesModule
      .getSchoolLeaderboard({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: { gameType: "haunted-library", difficulty: "medium" },
      })
      .catch(() => {
        // We only care about the query builder side effects, not the mock result.
      });

    const builder = db.select.mock.results[0]?.value;
    const fromCalls = (builder?.from?.mock?.calls ?? []) as Array<[unknown]>;
    const tableNames = fromCalls.map((call) => {
      const table = call[0];
      if (table && typeof table === "object") {
        return (table as Record<string | symbol, unknown>)[
          Symbol.for("drizzle:Name")
        ];
      }
      return undefined;
    });

    // Positive control: the leaderboard query must read game_completions.
    expect(
      tableNames,
      "getSchoolLeaderboard did not read from game_completions",
    ).toContain("game_completions");

    // Negative control: deprecated gameRankings must not be read.
    expect(
      tableNames,
      "getSchoolLeaderboard unexpectedly read from game_rankings",
    ).not.toContain("game_rankings");
  });
});

describe("host-mutation Zod hardening (Group 4F, D-06 Tier 1)", () => {
  it("recordActivity rejects empty activityType", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await expect(
      recordActivity({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: { activityType: "", xpEarned: 5 },
      }),
    ).rejects.toThrow();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("recordActivity rejects xpEarned > 100", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await expect(
      recordActivity({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: { activityType: "LESSON_COMPLETE", xpEarned: 999 },
      }),
    ).rejects.toThrow();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("recordActivity rejects metadata that is too long", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await expect(
      recordActivity({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: { activityType: "LESSON_COMPLETE", metadata: "x".repeat(5000) },
      }),
    ).rejects.toThrow();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("recordActivity accepts a valid payload (positive control)", async () => {
    const db = createMockDb({ insertReturning: [{ id: "activity-1" }] });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const result = await recordActivity({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input: { activityType: "LESSON_COMPLETE", xpEarned: 5 },
    });

    expect(result).toMatchObject({ id: "activity-1" });
    expect(db.insert).toHaveBeenCalled();
  });

  it("recordActivity rejects unknown keys under .strict()", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await expect(
      recordActivity({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: {
          activityType: "LESSON_COMPLETE",
          xpEarned: 5,
          extraKey: 1,
        } as unknown as { activityType: string; xpEarned?: number },
      }),
    ).rejects.toThrow();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("updateLessonProgress rejects a non-UUID lessonId", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await expect(
      updateLessonProgress({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: { lessonId: "not-a-uuid", status: "completed", progress: 100 },
      }),
    ).rejects.toThrow();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("updateLessonProgress rejects an invalid status enum value", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await expect(
      updateLessonProgress({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: { lessonId: "11111111-1111-1111-1111-111111111111", status: "fake", progress: 100 },
      }),
    ).rejects.toThrow();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("updateLessonProgress rejects progress outside 0..100", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await expect(
      updateLessonProgress({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: { lessonId: "11111111-1111-1111-1111-111111111111", status: "completed", progress: 150 },
      }),
    ).rejects.toThrow();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("updateLessonProgress accepts a valid payload (positive control)", async () => {
    const db = createMockDb({ insertReturning: [{ id: "progress-1" }] });
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    const result = await updateLessonProgress({
      db: tenantDb,
      user: mockUser,
      tenant: mockTenant,
      input: { lessonId: "11111111-1111-1111-1111-111111111111", status: "completed", progress: 100 },
    });

    expect(result).toMatchObject({ id: "progress-1" });
    expect(db.insert).toHaveBeenCalled();
  });

  it("updateLessonProgress rejects unknown keys under .strict()", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, mockTenant);

    await expect(
      updateLessonProgress({
        db: tenantDb,
        user: mockUser,
        tenant: mockTenant,
        input: {
          lessonId: "11111111-1111-1111-1111-111111111111",
          status: "completed",
          progress: 100,
          extraKey: 1,
        } as unknown as { lessonId: string; status: string; progress: number },
      }),
    ).rejects.toThrow();
    expect(db.insert).not.toHaveBeenCalled();
  });
});

// Tier 2 deferral note (Decision 4.4): the lessonId tenant-ownership check is
// intentionally NOT tested here. It requires an assignments-based ownership
// query and is tracked as [b] deferred:infra in plan.md Phase 6.
