import { describe, expect, it, vi } from "vitest";
import type { TenantDB } from "../db-contract.js";
import type { GameCompletionInput } from "../games/contracts.js";
import { recordGameCompletion } from "../games/mutations.js";
import { getEligibleRpgRewards } from "../rpg/definitions.js";
import { equipMyRpgCosmetic, grantCompletionCosmetics } from "../rpg/mutations.js";
import { getMyRpgState } from "../rpg/queries.js";
import { createMockDb } from "./mock-db.js";

vi.mock("@reading-advantage/auth", () => ({
  assertCan: vi.fn(),
  AuthError: class AuthError extends Error {
    code = "FORBIDDEN";
  },
}));

const user = {
  id: "student-a",
  username: "student-a",
  name: "Student A",
  role: "STUDENT" as const,
  schoolId: "11111111-1111-1111-1111-111111111111",
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};
const tenant = { schoolId: user.schoolId };

const perfectEvidence = {
  schemaVersion: 1,
  declaredModality: "read-to-select-audio",
  effectiveModality: "read-to-select-audio",
  promptLocale: "th-TH",
  answerLocale: "en-US",
  promptField: "translation",
  answerField: "term",
  itemCount: 2,
  questions: [
    {
      questionPosition: 0,
      promptItemPosition: 0,
      selectionAttempts: [{
        attemptIndex: 0,
        clipItemPosition: 0,
        playbackResult: "completed",
        submitted: true,
        completedQuestion: true,
      }],
    },
    {
      questionPosition: 1,
      promptItemPosition: 1,
      selectionAttempts: [{
        attemptIndex: 0,
        clipItemPosition: 1,
        playbackResult: "completed",
        submitted: true,
        completedQuestion: true,
      }],
    },
  ],
  replayCounts: [],
  audioFailures: [],
} as const;

function completion(overrides: Record<string, unknown> = {}) {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    schoolId: tenant.schoolId,
    userId: user.id,
    gameType: "wizard-vs-zombie",
    correctAnswers: 2,
    totalAttempts: 2,
    victory: true,
    metadata: { learningEvidence: perfectEvidence },
    ...overrides,
  };
}

describe("RPG quest rules", () => {
  it("grants all three fixed rewards for one complete perfect audio victory", () => {
    expect(getEligibleRpgRewards(completion())).toEqual([
      { questId: "first-ward", cosmeticId: "apprentice-wand" },
      { questId: "complete-the-ward", cosmeticId: "graveyard-staff" },
      { questId: "perfect-english-audio", cosmeticId: "echo-staff" },
    ]);
  });

  it("keeps audio rewards locked for reverse locales and incomplete sessions", () => {
    const reverseLocales = {
      ...perfectEvidence,
      promptLocale: "en-US",
      answerLocale: "th-TH",
    };
    const partial = {
      ...perfectEvidence,
      questions: perfectEvidence.questions.slice(0, 1),
    };
    const failed = {
      ...perfectEvidence,
      questions: [{
        ...perfectEvidence.questions[0],
        selectionAttempts: [{
          ...perfectEvidence.questions[0].selectionAttempts[0],
          playbackResult: "failed",
          submitted: false,
          completedQuestion: false,
        }],
      }, perfectEvidence.questions[1]],
    };

    for (const evidence of [reverseLocales, partial, failed]) {
      expect(getEligibleRpgRewards(completion({
        metadata: { learningEvidence: evidence },
      }))).toEqual([
        { questId: "first-ward", cosmeticId: "apprentice-wand" },
        { questId: "complete-the-ward", cosmeticId: "graveyard-staff" },
      ]);
    }
  });

  it("does not use score or duration as reward authority", () => {
    const baseline = getEligibleRpgRewards(completion());
    expect(getEligibleRpgRewards(completion({ score: 0, duration: 1 }))).toEqual(baseline);
    expect(getEligibleRpgRewards(completion({ score: 999_999, duration: 999_999 }))).toEqual(baseline);
  });
});

describe("RPG persistence operations", () => {
  it("rejects an equip request when the authenticated user has no matching unlock", async () => {
    const db = createMockDb({ selectResults: [] });
    await expect(equipMyRpgCosmetic({
      db: db as unknown as TenantDB,
      user,
      tenant,
      input: { cosmeticId: "apprentice-wand" },
    })).rejects.toThrow("not unlocked");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("returns only fixed state and the authenticated user's stored unlocks", async () => {
    const unlockedAt = new Date("2026-09-09T00:00:00.000Z");
    const db = createMockDb({
      selectSequence: [
        [{ questId: "first-ward", cosmeticId: "apprentice-wand", unlockedAt }],
        [{ equippedEmblemId: "apprentice-wand" }],
      ],
    });
    const state = await getMyRpgState({
      db: db as unknown as TenantDB,
      user,
      tenant,
    });

    expect(state.equippedEmblemId).toBe("apprentice-wand");
    expect(state.cosmetics).toHaveLength(3);
    expect(state.quests).toHaveLength(3);
    expect(state.cosmetics[0]).toMatchObject({
      id: "apprentice-wand",
      unlockedAt: unlockedAt.toISOString(),
      equipped: true,
    });
  });

  it("uses conflict-safe inserts for repeated eligible grants", async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValue([]);
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const db = { insert: vi.fn().mockReturnValue({ values }) } as unknown as TenantDB;

    await grantCompletionCosmetics(db, completion());
    await grantCompletionCosmetics(db, completion());

    expect(onConflictDoNothing).toHaveBeenCalledTimes(2);
    expect(values.mock.calls[0]?.[0]).toHaveLength(3);
    expect(values.mock.calls[1]?.[0]).toHaveLength(3);
  });

  it("does not report an unrelated unique violation as a duplicate completion", async () => {
    const uniqueError = Object.assign(new Error("xp unique failure"), {
      code: "23505",
      constraint: "xp_logs_user_activity_unique",
    });
    const selectBuilder = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    const completionConflict = {
      returning: vi.fn().mockResolvedValue([{
        id: "22222222-2222-2222-2222-222222222222",
        schoolId: tenant.schoolId,
        userId: user.id,
        gameType: "wizard-vs-zombie",
        correctAnswers: 1,
        totalAttempts: 1,
        victory: true,
        metadata: null,
      }]),
    };
    const transactionDb = {
      insert: vi.fn()
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue(completionConflict),
        }) })
        .mockReturnValueOnce({ values: vi.fn().mockRejectedValue(uniqueError) }),
      unscoped: vi.fn(),
    };
    transactionDb.unscoped.mockReturnValue(transactionDb);
    const db = {
      select: vi.fn().mockReturnValue(selectBuilder),
      transaction: vi.fn(async (run) => run(transactionDb)),
    } as unknown as TenantDB;
    const input: GameCompletionInput = {
      gameType: "wizard-vs-zombie",
      difficulty: "medium",
      score: 10,
      accuracy: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      duration: 60_000,
      victory: true,
      idempotencyKey: "33333333-3333-3333-3333-333333333333",
      clientTimestamp: 1_788_940_800_000,
    };

    await expect(recordGameCompletion({ db, user, tenant, input })).rejects.toBe(uniqueError);
  });
});
