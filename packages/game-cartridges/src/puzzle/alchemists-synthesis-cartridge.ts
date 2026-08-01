import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
  type SupportedResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
  type PhysicalInputDescriptor,
} from "@reading-advantage/advantage-play-kit/systems";
import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import { ACCEPTED_STANDARD_PACK_BINDING, validateCartridgeManifest, type CartridgeManifest } from "@reading-advantage/advantage-play-kit/scaffolding";
import type { GameResults } from "@reading-advantage/game-contracts";

import { createPuzzleCartridgeScope, type PuzzleCartridgeScope } from "../puzzle-suitability.js";

const ALCHEMISTS_SYNTHESIS_RESULT_POLICY = Object.freeze({
  claimIds: Object.freeze(["AS-TRANS-002", "AS-RESULT-001"]),
  formula: "floor(correctAnswers * accuracy)",
});

/** Supported Alchemist's Synthesis round-count choices retained from accepted source evidence. */
export type AlchemistsSynthesisDifficulty = "easy" | "normal" | "hard";

/** Immutable state for one deterministic Alchemist's Synthesis round sequence. */
export interface AlchemistsSynthesisPuzzleSnapshot {
  /** Current terminal state. */
  readonly status: "playing" | "victory" | "gameover";
  /** Zero-based active round index. */
  readonly round: number;
  /** Correct answers accumulated across resolved rounds. */
  readonly correctAnswers: number;
}

/** Deterministic Alchemist's Synthesis session used for title-scoped proof and QC. */
export interface AlchemistsSynthesisPuzzleSession {
  /** Resolves an answer against the deterministic round target. */
  answer(term: string): AlchemistsSynthesisPuzzleSnapshot;
  /** Normalizes a physical keyboard or pointer descriptor through the T11 public input API. */
  dispatchPhysicalInput(input: PhysicalInputDescriptor): readonly string[];
  /** Resolves a supported compact or wide QC composition. */
  resolveQcComposition(viewport: Readonly<{ width: number; height: number }>): SupportedResponsiveComposition;
  /** Exact source-bound terminal result policy and the claims that authorize it. */
  readonly resultPolicy: typeof ALCHEMISTS_SYNTHESIS_RESULT_POLICY;
  /** Returns the once-emitted result after the configured final round. */
  results(): GameResults;
}

/** Non-public Alchemist's Synthesis candidate cartridge built only with T11 public APIs. */
export interface AlchemistsSynthesisPuzzleCartridge {
  /** T11-validated cartridge manifest with no selected assets before title acceptance. */
  readonly manifest: CartridgeManifest;
  /** Explicit no-catalog/no-host gate retained until title-specific evidence is accepted. */
  readonly scope: PuzzleCartridgeScope;
  /** Screen-reader-ready concise instructions for the available candidate controls. */
  readonly accessibilityText: "Use Enter or a pointer tap to confirm the vocabulary answer for each round.";
  /** Creates a deterministic fixed-round session from validated vocabulary input. */
  createSession(input: unknown, difficulty: AlchemistsSynthesisDifficulty, complete?: (result: GameResults) => void): AlchemistsSynthesisPuzzleSession;
}

/** Returns the accepted source-derived number of rounds for a difficulty. */
function roundsForDifficulty(difficulty: AlchemistsSynthesisDifficulty): number {
  return difficulty === "easy" ? 5 : difficulty === "normal" ? 7 : 10;
}

/** Resolves one supported T11 composition or fails closed for an unsupported viewport. */
function resolveQcComposition(viewport: Readonly<{ width: number; height: number }>): SupportedResponsiveComposition {
  const composition = resolveResponsiveComposition({ viewport, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, inputCapabilities: { keyboard: true, pointer: true, touch: true }, accessibility: { textScale: 1, touchScale: 1 }, config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
  if (!composition.supported) throw new Error(`Alchemist's Synthesis QC viewport is unsupported: ${composition.code}; ${composition.guidance}`);
  return composition;
}

/** Creates the title-specific T11 manifest without requesting unavailable selected semantic assets. */
function createManifest(): CartridgeManifest {
  return validateCartridgeManifest({
    schemaVersion: 1, id: "alchemists-synthesis", title: "Alchemist's Synthesis", description: "Source-bound vocabulary synthesis cartridge registered for Advantage Games QC only.", version: "0.1.0", runtimeApiVersion: DEVELOPER_KIT_API_VERSION, inputMode: "vocabulary",
    capabilities: ["capability:input-action-normalization", "capability:nonempty-content-precondition", "capability:result-accounting", "capability:single-completion-emission"],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING, semanticAssetRequirements: ["effects/32x32/combat/hit-01"],
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: "Pixel art assets by ElvGames", placement: "end-screen" }, selectedUnionMaterialization: "accepted-cartridge-selected-union-only", qcRegistration: { route: "/qc" },
  });
}

/**
 * Builds the Alchemist's Synthesis candidate cartridge without exposing it through a catalog or host.
 * @returns A title-specific candidate cartridge and its non-playable scope.
 */
export function buildAlchemistsSynthesisPuzzleCartridge(): AlchemistsSynthesisPuzzleCartridge {
  return Object.freeze({
    manifest: createManifest(),
    scope: createPuzzleCartridgeScope("alchemists-synthesis"),
    accessibilityText: "Use Enter or a pointer tap to confirm the vocabulary answer for each round.",
    createSession(input: unknown, difficulty: AlchemistsSynthesisDifficulty, complete?: (result: GameResults) => void): AlchemistsSynthesisPuzzleSession {
      const content = validateNonEmptyContent(input, "vocabulary").items;
      const maxRounds = roundsForDifficulty(difficulty);
      const accountant = createResultAccountant();
      const normalizeInput = createInputActionNormalizer({ keyboard: { Enter: "confirm" }, pointerTap: { action: "confirm" } });
      let round = 0;
      let correctAnswers = 0;
      let status: AlchemistsSynthesisPuzzleSnapshot["status"] = "playing";
      let delivered: GameResults | undefined;
      const latch = createCompletionLatch<GameResults>((result) => { delivered = result; complete?.(result); });
      const snapshot = (): AlchemistsSynthesisPuzzleSnapshot => Object.freeze({ status, round, correctAnswers });
      return Object.freeze({
        answer(term: string): AlchemistsSynthesisPuzzleSnapshot {
          if (status !== "playing") return snapshot();
          const correct = term === content[round % content.length]?.term;
          accountant.recordAttempt({ correct });
          if (correct) {
            correctAnswers += 1;
            accountant.addScore(10);
          }
          round += 1;
          if (round === maxRounds) {
            status = correctAnswers * 2 >= maxRounds ? "victory" : "gameover";
            const final = finalizeResult(accountant, { xpPerCorrect: 0, xpPerAccuracyPoint: 0, xpCap: 10, zeroAttemptsXp: 0 });
            latch.complete({
              accuracy: final.accuracy,
              xp: Math.floor(final.correctAnswers * final.accuracy),
              score: final.score,
              correctAnswers: final.correctAnswers,
              totalAttempts: final.totalAttempts,
            });
          }
          return snapshot();
        },
        dispatchPhysicalInput: (physical: PhysicalInputDescriptor) => Object.freeze(normalizeInput(physical).map(({ action }) => action)),
        resolveQcComposition,
        resultPolicy: ALCHEMISTS_SYNTHESIS_RESULT_POLICY,
        results(): GameResults {
          if (!delivered) throw new Error("Alchemist's Synthesis has not reached a terminal result");
          return delivered;
        },
      });
    },
  });
}
