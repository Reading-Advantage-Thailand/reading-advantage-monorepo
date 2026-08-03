/**
 * Dual-host signed-attempt completion for multi-title host-proof gameTypes.
 * Proves issue → checkpoint chain → authoritative completion persistence for
 * defense, puzzle, and traversal residual titles (not loaders-only).
 */
import { describe, expect, it, vi } from "vitest";

import * as hostProof from "../games/host-proof.js";

const SIGNING_SECRET = "dragon-flight-host-proof-test-secret-at-least-32-bytes";
const NOW = "2026-08-01T00:00:00.000Z";

const MULTI_TITLE_GAME_TYPES = [
  "castle-defense",
  "wizard-vs-zombie",
  "village-guardian",
  "enchanted-library",
  "rune-match",
  "alchemists-synthesis",
  "potion-rush",
  "rune-forge-chamber",
  "spellweavers-run",
  "shadow-gate-dungeon",
  "labyrinth-goblin-king",
  "griffin-riders-escape",
] as const;

const actor = Object.freeze({ userId: "user-1", schoolId: "school-1" });
const vocabularyInput = Object.freeze([
  Object.freeze({ term: "dragon", translation: "drago" }),
]);

type Action =
  | { sequence: number; kind: "choose-gate"; gate: "left" | "right"; elapsedMs: number }
  | { sequence: number; kind: "launch"; elapsedMs: number };

/**
 * Returns a required domain export or fails the test by name.
 * @param name Export name from games/host-proof.
 * @returns The exported function.
 */
function requiredOperation<T>(name: string): T {
  const candidate = (hostProof as Record<string, unknown>)[name];
  expect(candidate, `expected ${name}`).toEqual(expect.any(Function));
  return candidate as T;
}

/**
 * Builds dependency fakes for multi-title signed-attempt completion.
 * @returns Spies and fixtures for issue/attest/complete.
 */
function createDependencies() {
  return {
    secret: SIGNING_SECRET,
    gateToLaunchDwellMs: 250,
    now: () => NOW,
    createAttemptId: () => "22222222-2222-2222-2222-222222222222",
    loadVocabularyInput: vi.fn(async () => vocabularyInput),
    recordCompletion: vi.fn(async (input: { correctAnswers: number; accuracy: number; victory: boolean; duration: number }) => ({
      xpEarned:
        input.correctAnswers
        + (input.accuracy === 1 ? 2 : 0)
        + (input.victory ? 1 : 0)
        + (input.duration < 60_000 ? 1 : 0),
      duplicate: false,
    })),
    readCanonicalCompletion: vi.fn(async () => ({
      xpEarned: 5,
      score: 100,
      accuracy: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      duration: 700,
      victory: true,
    })),
    store: {
      begin: vi.fn(async () => ({ kind: "execute" as const, claimId: "claim-multi-1" })),
      lookupRecovery: vi.fn(async () => ({ kind: "missing" as const })),
      complete: vi.fn(async () => undefined),
      abandon: vi.fn(async () => undefined),
    },
  };
}

/**
 * Advances a deterministic server clock across attestation and completion.
 * @param dependencies Base dependency fakes.
 * @param timestamps Ordered ISO timestamps.
 * @returns Dependencies with a consuming now() clock.
 */
function withServerTimes(
  dependencies: ReturnType<typeof createDependencies>,
  timestamps: readonly string[],
) {
  let index = 0;
  return {
    ...dependencies,
    now: () => timestamps[Math.min(index++, timestamps.length - 1)] ?? NOW,
  };
}

describe("multi-title signed-attempt host-proof completion", () => {
  it.each(MULTI_TITLE_GAME_TYPES)(
    "issues, attests, and persists authoritative completion for %s",
    async (gameType) => {
      const issue = requiredOperation<
        (
          actor: typeof actor,
          input: unknown,
          deps: ReturnType<typeof createDependencies>,
        ) => Promise<{ attemptId: string; credential: string; expiresAt: string }>
      >("issueDragonFlightHostProofAttempt");
      const attest = requiredOperation<
        (
          actor: typeof actor,
          input: unknown,
          deps: ReturnType<typeof createDependencies>,
        ) => Promise<{ checkpoint: string }>
      >("attestDragonFlightHostProofAction");
      const completeAttempt = requiredOperation<
        (
          actor: typeof actor,
          input: unknown,
          deps: ReturnType<typeof createDependencies>,
        ) => Promise<{ score: number; xpEarned: number; duplicate: boolean }>
      >("completeDragonFlightHostProofAttempt");

      const base = createDependencies();
      const issued = await issue(actor, { gameType, difficulty: "medium" }, base);
      expect(base.loadVocabularyInput).toHaveBeenCalledWith(
        expect.objectContaining({ gameType, difficulty: "medium" }),
      );

      const actions: Action[] = [
        { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
        { sequence: 2, kind: "launch", elapsedMs: 700 },
      ];
      const timed = withServerTimes(base, [
        NOW,
        "2026-08-01T00:00:00.300Z",
        "2026-08-01T00:00:00.600Z",
      ]);
      const checkpoints: string[] = [];
      for (const action of actions) {
        const observed = await attest(
          actor,
          {
            attemptId: issued.attemptId,
            credential: issued.credential,
            action,
            ...(checkpoints.length === 0 ? {} : { previousCheckpoint: checkpoints.at(-1) }),
          },
          timed,
        );
        checkpoints.push(observed.checkpoint);
      }

      const result = await completeAttempt(
        actor,
        {
          attemptId: issued.attemptId,
          credential: issued.credential,
          idempotencyKey: issued.attemptId,
          actions,
          checkpoints,
        },
        timed,
      );

      expect(result).toMatchObject({
        score: 100,
        accuracy: 1,
        correctAnswers: 1,
        totalAttempts: 1,
        duration: 700,
        xpEarned: 5,
        duplicate: false,
      });
      expect(base.recordCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType,
          difficulty: "medium",
          score: 100,
          victory: true,
          idempotencyKey: issued.attemptId,
        }),
      );
      expect(base.store.complete).toHaveBeenCalled();
    },
  );

  it("rejects unknown multi-title gameTypes at issue time", async () => {
    const issue = requiredOperation<
      (
        actor: typeof actor,
        input: unknown,
        deps: ReturnType<typeof createDependencies>,
      ) => Promise<unknown>
    >("issueDragonFlightHostProofAttempt");
    await expect(
      issue(actor, { gameType: "storm-castle-tower", difficulty: "medium" }, createDependencies()),
    ).rejects.toThrow();
  });
});
