import { DRAGON_RIDER_HOST_PROOF_BINDING } from "@reading-advantage/game-contracts";
import { z } from "zod";

/** One signed input action accepted by Dragon Rider's server-side transcript replay. */
export const dragonRiderHostProofActionSchema = z.object({
    sequence: z.number().int().positive(),
    kind: z.literal("choose-gate"),
    round: z.number().int().positive(),
    gate: z.enum(["left", "right"]),
  }).strict();

/** Validated action type accepted by Dragon Rider's server-side transcript replay. */
export type DragonRiderHostProofAction = z.infer<typeof dragonRiderHostProofActionSchema>;

/** One vocabulary prompt supplied to a signed Dragon Rider attempt. */
export const dragonRiderHostProofInputSchema = z.object({
  term: z.string().trim().min(1),
  translation: z.string().trim().min(1),
}).strict();

/**
 * Strict client action envelope accepted by a title-local attempt transport.
 * It deliberately excludes seed, content, results, timestamps, and server record fields.
 */
export const dragonRiderHostProofClientActionSubmissionSchema = z.object({
  credential: z.string().min(1),
  action: dragonRiderHostProofActionSchema,
  previousCheckpoint: z.string().min(1).optional(),
}).strict();

/** One server-recorded action paired with its authoritative receipt timestamp. */
export interface DragonRiderHostProofRecordedAction {
  /** Strict client action retained after title-local transport validation. */
  readonly action: DragonRiderHostProofAction;
  /** Server-observed monotonic offset from the issued attempt timestamp. */
  readonly observedElapsedMs: number;
}

/** A replayed gate round with its server-derived matching route. */
export interface DragonRiderHostProofRound {
  /** One-based gate round number. */
  readonly round: number;
  /** Source-language vocabulary term presented by this round. */
  readonly term: string;
  /** Target-language translation presented by this round. */
  readonly translation: string;
  /** Server-derived matching gate for this round. */
  readonly correctGate: "left" | "right";
}

/** Canonical result calculated from a signed Dragon Rider action transcript. */
export interface DragonRiderHostProofReplay {
  /** Immutable expected rounds derived from the server-issued input and seed. */
  readonly rounds: readonly DragonRiderHostProofRound[];
  /** Result derived solely from the strict server replay. */
  readonly result: Readonly<{
    /** Number of correct vocabulary gate choices. */
    readonly correctAnswers: number;
    /** Number of submitted vocabulary gate choices. */
    readonly totalAttempts: number;
    /** Score derived solely from correct server-replayed choices. */
    readonly score: number;
    /** Whether every required gate and the boss transition completed validly. */
    readonly victory: boolean;
    /** Dragon allies retained after gate resolution. */
    readonly dragonCount: number;
    /** Boss power required by the admitted traversal rule. */
    readonly bossPower: number;
  }>;
  /** Number of correct vocabulary gate choices. */
  readonly correctAnswers: number;
  /** Number of submitted vocabulary gate choices. */
  readonly totalAttempts: number;
  /** Score derived solely from correct server-replayed choices. */
  readonly score: number;
  /** Whether every required gate and the boss transition completed validly. */
  readonly victory: boolean;
  /** Dragon allies retained after gate resolution. */
  readonly dragonCount: number;
  /** Boss power required by the admitted traversal rule. */
  readonly bossPower: number;
  /** Server-replayed traversal timer. */
  readonly elapsedMs: number;
  /** Whether running rounds or the boss phase is active. */
  readonly phase: "running" | "boss";
}

/** Exact standard-pack bindings admitted for Dragon Rider's title-local host proof. */
export const DRAGON_RIDER_HOST_PROOF_REQUIRED_ASSET_BINDINGS = Object.freeze(
  [...DRAGON_RIDER_HOST_PROOF_BINDING.selectedSemanticKeys],
);

/** Exact admitted source claims which constrain this title-local replay implementation. */
export const DRAGON_RIDER_HOST_PROOF_CLAIM_IDS = Object.freeze(
  [...DRAGON_RIDER_HOST_PROOF_BINDING.claimEvidence.claimIds],
);

/**
 * Derives a stable gate side from server-issued seed text and the round index.
 * @param seed Server-issued unpredictable attempt seed.
 * @param roundIndex Zero-based round index.
 * @returns The matching gate side for the replayed vocabulary round.
 */
function correctGateForRound(seed: string, roundIndex: number): "left" | "right" {
  const offset = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0) % 2;
  return (offset + roundIndex) % 2 === 0 ? "left" : "right";
}

/**
 * Replays a strictly ordered Dragon Rider transcript from server-issued inputs and recorded receipts.
 * @param input Frozen vocabulary loaded by the server when it issued the attempt.
 * @param seed Server-issued seed bound to the signed attempt credential.
 * @param recordedActions Validated client actions paired with server-recorded monotonic receipt offsets.
 * @returns The canonical title-owned replay result.
 * @throws When the transcript is malformed, out of order, or attempts an invalid transition.
 */
export function replayDragonRiderHostProofTranscript(
  input: readonly z.infer<typeof dragonRiderHostProofInputSchema>[],
  seed: string,
  recordedActions: readonly DragonRiderHostProofRecordedAction[],
  terminalElapsedMs: number,
): DragonRiderHostProofReplay {
  const parsedInput = z.array(dragonRiderHostProofInputSchema).min(1).parse(input);
  const parsedSeed = z.string().min(1).parse(seed);
  const rounds = Object.freeze(parsedInput.map((prompt, index) => Object.freeze({
    round: index + 1,
    term: prompt.term,
    translation: prompt.translation,
    correctGate: correctGateForRound(parsedSeed, index),
  })));
  let correctAnswers = 0;
  let totalAttempts = 0;
  let expectedSequence = 1;
  let expectedRound = 1;
  let elapsedMs = 0;
  let dragonCount = 1;
  let pendingGate: { readonly round: number; readonly gate: "left" | "right"; readonly selectedAtMs: number } | undefined;
  let phase: "running" | "boss" = "running";

  for (const record of recordedActions) {
    const action = dragonRiderHostProofActionSchema.parse(record.action);
    const serverElapsedMs = record.observedElapsedMs;
    if (!Number.isSafeInteger(serverElapsedMs) || serverElapsedMs < elapsedMs) {
      throw new Error("Dragon Rider replay time must be monotonic and server-owned");
    }
    elapsedMs = Math.min(150_000, serverElapsedMs);
    if (pendingGate && elapsedMs - pendingGate.selectedAtMs >= 60) {
      const round = rounds[pendingGate.round - 1];
      if (!round) throw new Error("Dragon Rider transcript references a missing gate round");
      totalAttempts += 1;
      if (pendingGate.gate === round.correctGate) {
        correctAnswers += 1;
        dragonCount += 1;
      } else {
        dragonCount = Math.max(1, dragonCount - 1);
      }
      expectedRound += 1;
      pendingGate = undefined;
    }
    if (elapsedMs === 150_000) phase = "boss";
    if (action.sequence !== expectedSequence) {
      throw new Error("Dragon Rider transcript action sequence is not contiguous");
    }
    expectedSequence += 1;
    if (phase !== "running" || pendingGate || action.round !== expectedRound || expectedRound > rounds.length) {
        throw new Error("Dragon Rider transcript chose a gate outside the active round");
    }
    pendingGate = Object.freeze({ round: action.round, gate: action.gate, selectedAtMs: elapsedMs });
  }

  if (!Number.isSafeInteger(terminalElapsedMs) || terminalElapsedMs < elapsedMs || terminalElapsedMs < 150_000) throw new Error("Dragon Rider server terminal time has not reached the admitted run duration");
  elapsedMs = 150_000; phase = "boss";
  if (pendingGate) {
    const round = rounds[pendingGate.round - 1]; if (!round || terminalElapsedMs - pendingGate.selectedAtMs < 60) throw new Error("Dragon Rider terminal did not resolve the final gate");
    totalAttempts += 1; if (pendingGate.gate === round.correctGate) { correctAnswers += 1; dragonCount += 1; } else dragonCount = Math.max(1, dragonCount - 1); expectedRound += 1;
  }
  if (expectedRound <= rounds.length) throw new Error("Dragon Rider terminal has unresolved frozen rounds");

  const bossPower = Math.max(3, Math.ceil(totalAttempts * 0.75));
  const victory = phase === "boss" && dragonCount >= bossPower;
  return Object.freeze({
    rounds,
    result: Object.freeze({
      correctAnswers,
      totalAttempts,
      score: correctAnswers * 100,
      victory,
      dragonCount,
      bossPower,
    }),
    correctAnswers,
    totalAttempts,
    score: correctAnswers * 100,
    victory,
    dragonCount,
    bossPower,
    elapsedMs,
    phase,
  });
}

/**
 * Rejects a replay that does not prove a complete Dragon Rider victory.
 * @param replay Canonical replay result to validate for completion admission.
 * @throws When the boss phase did not end with enough dragons to meet its derived power.
 */
export function assertDragonRiderHostProofVictory(replay: DragonRiderHostProofReplay): void {
  if (!replay.victory) {
    throw new Error("Dragon Rider transcript is not victorious");
  }
}
