import { describe, expect, it, vi } from "vitest";

import { replayDragonRiderHostProofTranscript } from "../../../game-cartridges/src/dragon-rider-host-proof.js";

import {
  attestDragonRiderHostProofAction,
  attestDragonRiderHostProofActionSchema,
  completeDragonRiderHostProofAttempt,
  issueDragonRiderHostProofAttempt,
  type DragonRiderHostProofAttemptDependencies,
  type DragonRiderHostProofStoredAttempt,
} from "../games/dragon-rider-host-proof-attempt.js";
import { calculateGameXP } from "../games/xp.js";

const actor = { userId: "user-a", schoolId: "school-a" } as const;
const input = [
  { term: "dragon", translation: "drago" }, { term: "rider", translation: "jinete" },
  { term: "gate", translation: "puerta" }, { term: "fire", translation: "fuego" },
] as const;

/** Builds an in-memory durable-store double for title-local attempt tests. */
function createStore(backing: { state: DragonRiderHostProofStoredAttempt | null; completed: any | null } = { state: null, completed: null }) {
  return {
    backing,
    tamper: () => { backing.state = backing.state ? { ...backing.state, input: [{ term: "changed", translation: "cambio" }], checkpoints: backing.state.checkpoints } : null; },
    store: {
      issue: vi.fn(async (next: DragonRiderHostProofStoredAttempt) => { backing.state = structuredClone(next); }),
      appendCheckpoint: vi.fn(async ({ checkpoint }: { readonly attemptId: string; readonly checkpoint: string }) => {
        if (!backing.state) throw new Error("missing"); backing.state = { ...backing.state, checkpoints: [...backing.state.checkpoints, checkpoint] };
      }),
      read: vi.fn(async () => backing.state),
      complete: vi.fn(async ({ result }: { readonly attemptId: string; readonly result: any }) => {
        if (backing.completed) {
          if (backing.completed.score !== result.score) throw new Error("conflicting durable completion");
          return { ...backing.completed, duplicate: true } as any;
        }
        backing.completed = Object.freeze({ ...result, duplicate: false }); return backing.completed as any;
      }),
    },
  };
}

/** Issues deterministic dependencies with a server-owned clock. */
function createDependencies(store = createStore()) {
  const clock = ["2026-08-02T00:00:00.000Z", "2026-08-02T00:00:00.000Z", "2026-08-02T00:00:00.060Z", "2026-08-02T00:00:00.120Z", "2026-08-02T00:00:00.180Z", "2026-08-02T00:02:30.000Z", "2026-08-02T00:02:30.001Z", "2026-08-02T00:02:30.002Z"];
  const dependencies: DragonRiderHostProofAttemptDependencies = {
    secret: "a".repeat(32), now: () => clock.shift() ?? "2026-08-02T00:02:30.003Z",
    createAttemptId: () => "11111111-1111-4111-8111-111111111111", createSeed: () => "seed-1234567890123456",
    loadVocabularyInput: vi.fn(async () => input), recordCompletion: vi.fn(async (completion) => ({ xpEarned: calculateGameXP({ ...completion, clientTimestamp: 0 }), duplicate: false })), store: store.store,
  };
  return { dependencies, store };
}

/** Issues and records the exact server-timed non-perfect winning receipt chain. */
async function winningAttempt() {
  const fixture = createDependencies(); const attempt = await issueDragonRiderHostProofAttempt(actor, { gameType: "dragon-rider", difficulty: "easy" }, fixture.dependencies);
  const offset = [...attempt.seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2;
  const correctGate = (index: number): "left" | "right" => (offset + index) % 2 === 0 ? "left" : "right";
  const actions = [
    { sequence: 1, kind: "choose-gate" as const, round: 1, gate: correctGate(0) },
    { sequence: 2, kind: "choose-gate" as const, round: 2, gate: correctGate(1) },
    { sequence: 3, kind: "choose-gate" as const, round: 3, gate: correctGate(2) === "left" ? "right" : "left" },
    { sequence: 4, kind: "choose-gate" as const, round: 4, gate: correctGate(3) },
  ];
  let previousCheckpoint: string | undefined;
  for (const action of actions) {
    const receipt = await attestDragonRiderHostProofAction(actor, { attemptId: attempt.attemptId, credential: attempt.credential, action, ...(previousCheckpoint ? { previousCheckpoint } : {}) }, fixture.dependencies);
    previousCheckpoint = receipt.checkpoint;
  }
  return { ...fixture, attempt };
}

describe("Dragon Rider signed host-proof attempt", () => {
  it("pins a user/school credential and rejects unknown titles, another actor, tampering, and client server-record fields", async () => {
    const { dependencies } = createDependencies();
    await expect(issueDragonRiderHostProofAttempt(actor, { gameType: "dragon-flight", difficulty: "easy" }, dependencies)).rejects.toThrow();
    const attempt = await issueDragonRiderHostProofAttempt(actor, { gameType: "dragon-rider", difficulty: "easy" }, dependencies);
    await expect(attestDragonRiderHostProofAction({ userId: "user-b", schoolId: actor.schoolId }, { attemptId: attempt.attemptId, credential: attempt.credential, action: { sequence: 1, kind: "choose-gate", round: 1, gate: "left" } }, dependencies)).rejects.toThrow();
    await expect(attestDragonRiderHostProofAction(actor, { attemptId: attempt.attemptId, credential: `${attempt.credential}x`, action: { sequence: 1, kind: "choose-gate", round: 1, gate: "left" } }, dependencies)).rejects.toThrow();
    expect(() => attestDragonRiderHostProofActionSchema.parse({ attemptId: attempt.attemptId, credential: attempt.credential, action: { sequence: 1, kind: "choose-gate", round: 1, gate: "left" }, serverElapsedMs: 1 })).toThrow();
  });

  it("replays only the frozen stored snapshot and server receipt times, then returns its original result on retry", async () => {
    const { dependencies, attempt } = await winningAttempt();
    const first = await completeDragonRiderHostProofAttempt(actor, { attemptId: attempt.attemptId, credential: attempt.credential }, dependencies);
    const retry = await completeDragonRiderHostProofAttempt(actor, { attemptId: attempt.attemptId, credential: attempt.credential }, dependencies);
    expect(first).toMatchObject({ score: 300, correctAnswers: 3, totalAttempts: 4, duration: 150000, victory: true, xpEarned: 4 });
    expect(dependencies.recordCompletion).toHaveBeenCalledWith(expect.objectContaining({ duration: 150000 }));
    expect(retry).toMatchObject({ score: 300, xpEarned: 4, duplicate: true });
  });

  it("rejects a tampered stored snapshot instead of reloading changed source content", async () => {
    const { dependencies, store, attempt } = await winningAttempt();
    store.tamper();
    await expect(completeDragonRiderHostProofAttempt(actor, { attemptId: attempt.attemptId, credential: attempt.credential }, dependencies)).rejects.toThrow(/snapshot/i);
  });

  it("rejects an expired credential at both action attestation and completion", async () => {
    const { dependencies } = createDependencies();
    const attempt = await issueDragonRiderHostProofAttempt(actor, { gameType: "dragon-rider", difficulty: "easy" }, dependencies);
    (dependencies as { now: () => string }).now = () => "2026-08-02T00:11:00.000Z";
    await expect(attestDragonRiderHostProofAction(actor, { attemptId: attempt.attemptId, credential: attempt.credential, action: { sequence: 1, kind: "choose-gate", round: 1, gate: "left" } }, dependencies)).rejects.toThrow(/expired/i);
    await expect(completeDragonRiderHostProofAttempt(actor, { attemptId: attempt.attemptId, credential: attempt.credential }, dependencies)).rejects.toThrow(/expired/i);
  });

  it("recovers a persisted issued snapshot and receipt chain through a fresh store instance", async () => {
    const first = createStore(); const fixture = createDependencies(first);
    const attempt = await issueDragonRiderHostProofAttempt(actor, { gameType: "dragon-rider", difficulty: "easy" }, fixture.dependencies);
    const offset = [...attempt.seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 2;
    const gate = offset === 0 ? "left" : "right";
    const receipt = await attestDragonRiderHostProofAction(actor, { attemptId: attempt.attemptId, credential: attempt.credential, action: { sequence: 1, kind: "choose-gate", round: 1, gate } }, fixture.dependencies);
    const recovered = createStore(first.backing);
    expect(await recovered.store.read(attempt.attemptId)).toMatchObject({ input, checkpoints: [receipt.checkpoint] });
  });

  it("rejects a conflicting durable result for an already completed attempt", async () => {
    const store = createStore();
    const first = await store.store.complete({ attemptId: "11111111-1111-4111-8111-111111111111", result: { xpEarned: 12, score: 300, correctAnswers: 3, totalAttempts: 4, duration: 1, victory: true, duplicate: false } });
    expect(first.score).toBe(300);
    await expect(store.store.complete({ attemptId: "11111111-1111-4111-8111-111111111111", result: { xpEarned: 12, score: 999, correctAnswers: 3, totalAttempts: 4, duration: 1, victory: true, duplicate: false } })).rejects.toThrow(/conflict/i);
  });
});
