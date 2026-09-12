import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { Tenant } from "@reading-advantage/auth";
import {
  gameCompletions,
  schools,
  studentCosmeticUnlocks,
  studentRpgProfiles,
  users,
  xpLogs,
} from "@reading-advantage/db/schema";

vi.unmock("../tenant-registry.js");
vi.mock("@reading-advantage/auth", () => ({
  assertCan: vi.fn(),
  AuthError: class AuthError extends Error {
    code = "FORBIDDEN";
  },
}));

import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { recordGameCompletion } from "../games/mutations.js";
import { calculateGameXP } from "../games/xp.js";
import { equipMyRpgCosmetic } from "../rpg/mutations.js";
import { getMyRpgState } from "../rpg/queries.js";

const SCHOOL_A = "11111111-1111-1111-1111-111111111111";
const SCHOOL_B = "22222222-2222-2222-2222-222222222222";
const USER_A = "rpg-user-a";
const USER_B = "rpg-user-b";

function tenant(schoolId: string): Tenant {
  return { schoolId };
}

function user(id: string, schoolId: string) {
  return {
    id,
    username: id,
    name: id,
    role: "STUDENT" as const,
    schoolId,
    xp: 0,
    level: 1,
    cefrLevel: "A1",
  };
}

const learningEvidence = {
  schemaVersion: 1,
  declaredModality: "read-to-select-audio",
  effectiveModality: "read-to-select-audio",
  promptLocale: "th-TH",
  answerLocale: "en-US",
  promptField: "translation",
  answerField: "term",
  itemCount: 2,
  questions: [0, 1].map((position) => ({
    questionPosition: position,
    promptItemPosition: position,
    selectionAttempts: [{
      attemptIndex: 0,
      clipItemPosition: position,
      playbackResult: "completed",
      submitted: true,
      completedQuestion: true,
    }],
  })),
  replayCounts: [],
  audioFailures: [],
} as const;

function completionInput(idempotencyKey: string) {
  return {
    gameType: "wizard-vs-zombie",
    difficulty: "medium",
    score: 200,
    accuracy: 1,
    correctAnswers: 2,
    totalAttempts: 2,
    duration: 60_000,
    victory: true,
    idempotencyKey,
    clientTimestamp: 1_788_940_800_000,
    metadata: { learningEvidence },
  };
}

async function seedIdentity(harness: TestDb, schoolId: string, userId: string) {
  await harness.db.insert(schools).values({ id: schoolId, name: schoolId });
  await harness.db.insert(users).values({
    id: userId,
    username: userId,
    displayUsername: userId,
    name: userId,
    schoolId,
  });
}

describe("RPG persistence with PostgreSQL semantics", () => {
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

  it("grants each reward once across concurrent completion retries", async () => {
    await seedIdentity(harness, SCHOOL_A, USER_A);
    const input = completionInput("33333333-3333-3333-3333-333333333333");
    const run = () => recordGameCompletion({
      db: harness.tenantDb(tenant(SCHOOL_A)),
      user: user(USER_A, SCHOOL_A),
      tenant: tenant(SCHOOL_A),
      input,
    });

    const results = await Promise.all([run(), run(), run()]);
    expect(results.filter(({ duplicate }) => !duplicate)).toHaveLength(1);
    expect(results.filter(({ duplicate }) => duplicate)).toHaveLength(2);

    const unlocks = await harness.db.select().from(studentCosmeticUnlocks);
    const completions = await harness.db.select().from(gameCompletions);
    const ledger = await harness.db.select().from(xpLogs);
    expect(unlocks).toHaveLength(3);
    expect(new Set(unlocks.map(({ cosmeticId }) => cosmeticId)).size).toBe(3);
    expect(completions).toHaveLength(1);
    expect(ledger).toHaveLength(1);
    expect(results.find(({ duplicate }) => !duplicate)?.xpEarned).toBe(calculateGameXP(input));
    expect(ledger[0]?.xpEarned).toBe(calculateGameXP(input));
  });

  it("keeps school-A unlocks and equipment hidden from school B", async () => {
    await seedIdentity(harness, SCHOOL_A, USER_A);
    await seedIdentity(harness, SCHOOL_B, USER_B);
    await recordGameCompletion({
      db: harness.tenantDb(tenant(SCHOOL_A)),
      user: user(USER_A, SCHOOL_A),
      tenant: tenant(SCHOOL_A),
      input: completionInput("44444444-4444-4444-4444-444444444444"),
    });
    await equipMyRpgCosmetic({
      db: harness.tenantDb(tenant(SCHOOL_A)),
      user: user(USER_A, SCHOOL_A),
      tenant: tenant(SCHOOL_A),
      input: { cosmeticId: "echo-staff" },
    });

    const schoolAState = await getMyRpgState({
      db: harness.tenantDb(tenant(SCHOOL_A)),
      user: user(USER_A, SCHOOL_A),
      tenant: tenant(SCHOOL_A),
    });
    const schoolBState = await getMyRpgState({
      db: harness.tenantDb(tenant(SCHOOL_B)),
      user: user(USER_B, SCHOOL_B),
      tenant: tenant(SCHOOL_B),
    });
    expect(schoolAState.equippedEmblemId).toBe("echo-staff");
    expect(schoolAState.cosmetics.every(({ unlockedAt }) => unlockedAt)).toBe(true);
    expect(schoolBState.equippedEmblemId).toBeNull();
    expect(schoolBState.cosmetics.every(({ unlockedAt }) => unlockedAt === null)).toBe(true);
  });

  it("does not backfill rewards from an earlier completion", async () => {
    await seedIdentity(harness, SCHOOL_A, USER_A);
    const input = completionInput("55555555-5555-5555-5555-555555555555");
    await harness.db.insert(gameCompletions).values({
      schoolId: SCHOOL_A,
      userId: USER_A,
      gameType: input.gameType,
      difficulty: input.difficulty,
      score: input.score,
      accuracy: input.accuracy,
      correctAnswers: input.correctAnswers,
      totalAttempts: input.totalAttempts,
      duration: input.duration,
      victory: input.victory,
      xpEarned: calculateGameXP(input),
      activityId: `game:${input.gameType}:${input.idempotencyKey}`,
      metadata: input.metadata,
    });

    const state = await getMyRpgState({
      db: harness.tenantDb(tenant(SCHOOL_A)),
      user: user(USER_A, SCHOOL_A),
      tenant: tenant(SCHOOL_A),
    });
    expect(state.quests.every(({ completed }) => !completed)).toBe(true);
  });

  it("rolls back completion, XP, and rewards after an unexpected reward failure", async () => {
    await seedIdentity(harness, SCHOOL_A, USER_A);
    await harness.db.execute(sql.raw(`
      CREATE FUNCTION reject_rpg_unlock() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'unexpected reward failure';
      END;
      $$ LANGUAGE plpgsql
    `));
    await harness.db.execute(sql.raw(`
      CREATE TRIGGER reject_rpg_unlock_trigger
      BEFORE INSERT ON student_cosmetic_unlocks
      FOR EACH ROW EXECUTE FUNCTION reject_rpg_unlock()
    `));

    try {
      await expect(recordGameCompletion({
        db: harness.tenantDb(tenant(SCHOOL_A)),
        user: user(USER_A, SCHOOL_A),
        tenant: tenant(SCHOOL_A),
        input: completionInput("66666666-6666-6666-6666-666666666666"),
      })).rejects.toThrow("student_cosmetic_unlocks");
    } finally {
      await harness.db.execute(sql.raw("DROP TRIGGER reject_rpg_unlock_trigger ON student_cosmetic_unlocks"));
      await harness.db.execute(sql.raw("DROP FUNCTION reject_rpg_unlock()"));
    }

    expect(await harness.db.select().from(gameCompletions)).toHaveLength(0);
    expect(await harness.db.select().from(xpLogs)).toHaveLength(0);
    expect(await harness.db.select().from(studentCosmeticUnlocks)).toHaveLength(0);
    expect(await harness.db.select().from(studentRpgProfiles)
      .where(eq(studentRpgProfiles.userId, USER_A))).toHaveLength(0);
  });
});
