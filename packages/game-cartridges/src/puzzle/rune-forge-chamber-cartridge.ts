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

const RUNE_FORGE_INITIAL_HEALTH = 100;
const RUNE_FORGE_WRONG_WORD_DAMAGE = 15;
const RUNE_FORGE_CLAIM_IDS = Object.freeze(["RFC-CUR-011", "RFC-CUR-012", "RFC-CUR-013"]);

/** Immutable Rune Forge Chamber state after a rune selection. */
export interface RuneForgeChamberPuzzleSnapshot {
  /** Source-aligned terminal state; successful sequences advance levels rather than emit an invented victory. */
  readonly status: "playing" | "defeat";
  /** Current forge health. */
  readonly health: number;
  /** Current one-based level. */
  readonly level: number;
  /** Zero-based expected word position in the active sentence. */
  readonly targetIndex: number;
  /** Source-configured damage applied to each wrong rune selection. */
  readonly damagePerMismatch: 15;
  /** Exact source claims retained by this deterministic mechanic. */
  readonly claimIds: readonly string[];
}

/** Deterministic Rune Forge Chamber session used for title-scoped proof and QC. */
export interface RuneForgeChamberPuzzleSession {
  /** Selects one rune token, advancing an ordered sentence or reducing forge health. */
  selectRune(token: string): RuneForgeChamberPuzzleSnapshot;
  /** Normalizes a physical keyboard or pointer descriptor through the T11 public input API. */
  dispatchPhysicalInput(input: PhysicalInputDescriptor): readonly string[];
  /** Resolves a supported compact or wide QC composition. */
  resolveQcComposition(viewport: Readonly<{ width: number; height: number }>): SupportedResponsiveComposition;
  /** Returns the current immutable source-bound mechanic state. */
  snapshot(): RuneForgeChamberPuzzleSnapshot;
  /** Returns the once-emitted result after defeat. */
  results(): GameResults;
}

/** Non-public Rune Forge Chamber candidate cartridge built only with T11 public APIs. */
export interface RuneForgeChamberPuzzleCartridge {
  /** T11-validated cartridge manifest with no selected assets before title acceptance. */
  readonly manifest: CartridgeManifest;
  /** Explicit no-catalog/no-host gate retained until title-specific evidence is accepted. */
  readonly scope: PuzzleCartridgeScope;
  /** Screen-reader-ready concise instructions for the available candidate controls. */
  readonly accessibilityText: "Use Enter or a pointer tap to select the next rune word in order.";
  /** Creates a deterministic ordered-rune session from validated sentence input. */
  createSession(input: unknown, complete?: (result: GameResults) => void): RuneForgeChamberPuzzleSession;
}

/** Resolves one supported T11 composition or fails closed for an unsupported viewport. */
function resolveQcComposition(viewport: Readonly<{ width: number; height: number }>): SupportedResponsiveComposition {
  const composition = resolveResponsiveComposition({ viewport, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, inputCapabilities: { keyboard: true, pointer: true, touch: true }, accessibility: { textScale: 1, touchScale: 1 }, config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
  if (!composition.supported) throw new Error(`Rune Forge Chamber QC viewport is unsupported: ${composition.code}; ${composition.guidance}`);
  return composition;
}

/** Creates the title-specific T11 manifest without requesting unavailable selected semantic assets. */
function createManifest(): CartridgeManifest {
  return validateCartridgeManifest({
    schemaVersion: 1, id: "rune-forge-chamber", title: "Rune Forge Chamber", description: "Source-bound ordered-rune cartridge registered for Advantage Games QC only.", version: "0.1.0", runtimeApiVersion: DEVELOPER_KIT_API_VERSION, inputMode: "sentence",
    capabilities: ["capability:input-action-normalization", "capability:nonempty-content-precondition", "capability:result-accounting", "capability:single-completion-emission"],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING, semanticAssetRequirements: ["top-down/32x32/characters/hero-01"],
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: "Pixel art assets by ElvGames", placement: "end-screen" }, selectedUnionMaterialization: "accepted-cartridge-selected-union-only", qcRegistration: { route: "/qc" },
  });
}

/**
 * Builds the Rune Forge Chamber candidate cartridge without exposing it through a catalog or host.
 * @returns A title-specific candidate cartridge and its non-playable scope.
 */
export function buildRuneForgeChamberPuzzleCartridge(): RuneForgeChamberPuzzleCartridge {
  return Object.freeze({
    manifest: createManifest(),
    scope: createPuzzleCartridgeScope("rune-forge-chamber"),
    accessibilityText: "Use Enter or a pointer tap to select the next rune word in order.",
    createSession(input: unknown, complete?: (result: GameResults) => void): RuneForgeChamberPuzzleSession {
      const content = validateNonEmptyContent(input, "sentence").items;
      const accountant = createResultAccountant();
      const normalizeInput = createInputActionNormalizer({ keyboard: { Enter: "confirm" }, pointerTap: { action: "confirm" } });
      let sentenceIndex = 0;
      let targetIndex = 0;
      let level = 1;
      let health = RUNE_FORGE_INITIAL_HEALTH;
      let status: RuneForgeChamberPuzzleSnapshot["status"] = "playing";
      let delivered: GameResults | undefined;
      const latch = createCompletionLatch<GameResults>((result) => { delivered = result; complete?.(result); });
      const words = (): readonly string[] => content[sentenceIndex % content.length]!.term.split(/\s+/u).filter(Boolean);
      const snapshot = (): RuneForgeChamberPuzzleSnapshot => Object.freeze({
        status,
        health,
        level,
        targetIndex,
        damagePerMismatch: RUNE_FORGE_WRONG_WORD_DAMAGE,
        claimIds: RUNE_FORGE_CLAIM_IDS,
      });
      const emitDefeat = (): void => {
        const final = finalizeResult(accountant, { xpPerCorrect: 0, xpPerAccuracyPoint: 0, xpCap: 10, zeroAttemptsXp: 0 });
        const xp = Math.min(
          10,
          final.correctAnswers
            + (final.accuracy === 1 ? 2 : 0)
            + 1
            + (health / RUNE_FORGE_INITIAL_HEALTH * 100 >= 50 ? 1 : 0),
        );
        latch.complete({ accuracy: final.accuracy, xp, score: final.score, correctAnswers: final.correctAnswers, totalAttempts: final.totalAttempts });
      };
      return Object.freeze({
        selectRune(token: string): RuneForgeChamberPuzzleSnapshot {
          if (status !== "playing") return snapshot();
          const correct = token === words()[targetIndex];
          accountant.recordAttempt({ correct });
          if (!correct) {
            health -= RUNE_FORGE_WRONG_WORD_DAMAGE;
            if (health <= 0) {
              health = 0;
              status = "defeat";
              emitDefeat();
            }
            return snapshot();
          }
          accountant.addScore(10);
          targetIndex += 1;
          if (targetIndex === words().length) {
            sentenceIndex += 1;
            targetIndex = 0;
            level += 1;
          }
          return snapshot();
        },
        dispatchPhysicalInput: (physical: PhysicalInputDescriptor) => Object.freeze(normalizeInput(physical).map(({ action }) => action)),
        resolveQcComposition,
        snapshot,
        results(): GameResults {
          if (!delivered) throw new Error("Rune Forge Chamber has not reached a terminal result");
          return delivered;
        },
      });
    },
  });
}
