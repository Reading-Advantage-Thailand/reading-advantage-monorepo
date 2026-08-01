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
import {
  ACCEPTED_STANDARD_PACK_BINDING,
  validateCartridgeManifest,
  type CartridgeManifest,
} from "@reading-advantage/advantage-play-kit/scaffolding";
import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import type { GameResults } from "@reading-advantage/game-contracts";

import {
  ENCHANTED_LIBRARY_WALK_DESCRIPTOR,
  createPuzzleCartridgeScope,
  type PuzzleCartridgeScope,
} from "../puzzle-suitability.js";

const ENCHANTED_LIBRARY_RESULT_POLICY = Object.freeze({
  claimIds: Object.freeze(["EL-COLL-001", "EL-VICTORY-001", "EL-XP-001"]),
  formula: "correctAnswers + perfectAccuracyBonus + manaBonus + speedBonus, capped at 10",
});

/** Returns the required descriptor-owned walk clip and fails before any puzzle state is created on drift. */
function getWalkClip(): NonNullable<typeof ENCHANTED_LIBRARY_WALK_DESCRIPTOR.clips>[number] {
  const clip = ENCHANTED_LIBRARY_WALK_DESCRIPTOR.clips?.find((candidate) => candidate.id === "walk");
  if (!clip) throw new Error("Enchanted Library accepted walk descriptor is missing the walk clip");
  return clip;
}

const WALK_CLIP = getWalkClip();

/** Descriptor-owned animation behavior consumed by the Enchanted Library runtime. */
export interface EnchantedLibraryWalkPlayback {
  /** The exact accepted descriptor identity. */
  readonly descriptorId: "enchanted-library-player-walk-v1";
  /** Descriptor-owned clip identity. */
  readonly clipId: "walk";
  /** Descriptor-owned directional mapping. */
  readonly direction: "down";
  /** Descriptor-owned playback rate. */
  readonly fps: 12;
  /** Descriptor-owned loop behavior. */
  readonly loop: true;
  /** Six descriptor-owned frame coordinates, never a game-owned frame count. */
  readonly frames: readonly Readonly<{ column: number; row: number }>[];
  /** Source claim IDs for the retained collection and result policy. */
  readonly claimIds: readonly string[];
}

/** Immutable progress state for the Enchanted Library learning loop. */
export interface EnchantedLibraryPuzzleSnapshot {
  /** Current terminal state. */
  readonly status: "playing" | "victory";
  /** Number of successful collections for the current and completed vocabulary terms. */
  readonly progress: number;
  /** Zero-based vocabulary target index. */
  readonly targetIndex: number;
  /** Current source-derived mana used by the exact terminal XP policy. */
  readonly mana: number;
  /** Elapsed session time used by the exact terminal XP policy. */
  readonly gameTimeMs: number;
  /** Current frame index selected from the descriptor-owned walk clip. */
  readonly walkFrameIndex: number;
}

/** Deterministic Enchanted Library session used for title-scoped proof and QC. */
export interface EnchantedLibraryPuzzleSession {
  /** Collects one book term and applies the two-correct-per-word progression rule. */
  collect(term: string): EnchantedLibraryPuzzleSnapshot;
  /** Normalizes a physical keyboard or pointer descriptor through the T11 public input API. */
  dispatchPhysicalInput(input: PhysicalInputDescriptor): readonly string[];
  /** Resolves a supported compact or wide QC composition without altering puzzle state. */
  resolveQcComposition(viewport: Readonly<{ width: number; height: number }>): SupportedResponsiveComposition;
  /** Advances descriptor-owned walk playback and returns the current frame coordinate. */
  advanceWalk(elapsedMs: number): Readonly<{ column: number; row: number }>;
  /** Returns the descriptor-owned six-frame, 12fps walk behavior consumed by this runtime. */
  walkPlayback(): EnchantedLibraryWalkPlayback;
  /** Returns the current immutable puzzle snapshot. */
  snapshot(): EnchantedLibraryPuzzleSnapshot;
  /** Returns the once-emitted result after victory. */
  results(): GameResults;
}

/** Non-public Enchanted Library candidate cartridge built only with T11 public APIs. */
export interface EnchantedLibraryPuzzleCartridge {
  /** T11-validated cartridge manifest with no selected assets before title acceptance. */
  readonly manifest: CartridgeManifest;
  /** Explicit no-catalog/no-host gate retained until title-specific evidence is accepted. */
  readonly scope: PuzzleCartridgeScope;
  /** Screen-reader-ready concise instructions for the available candidate controls. */
  readonly accessibilityText: "Use keyboard arrows or a pointer drag to move, then collect the matching book twice.";
  /** Creates a deterministic learning-loop session from validated vocabulary input. */
  createSession(input: unknown, complete?: (result: GameResults) => void): EnchantedLibraryPuzzleSession;
}

/** Resolves one supported T11 composition or fails closed for an unsupported viewport. */
function resolveQcComposition(viewport: Readonly<{ width: number; height: number }>): SupportedResponsiveComposition {
  const composition = resolveResponsiveComposition({
    viewport,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    inputCapabilities: { keyboard: true, pointer: true, touch: true },
    accessibility: { textScale: 1, touchScale: 1 },
    config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  });
  if (!composition.supported) throw new Error(`Enchanted Library QC viewport is unsupported: ${composition.code}; ${composition.guidance}`);
  return composition;
}

/** Creates the title-specific T11 manifest without requesting unavailable selected semantic assets. */
function createManifest(): CartridgeManifest {
  return validateCartridgeManifest({
    schemaVersion: 1,
    id: "enchanted-library",
    title: "Enchanted Library",
    description: "Source-bound vocabulary collection cartridge registered for Advantage Games QC only.",
    version: "0.1.0",
    runtimeApiVersion: DEVELOPER_KIT_API_VERSION,
    inputMode: "vocabulary",
    capabilities: [
      "capability:input-action-normalization",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
    ],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    semanticAssetRequirements: ["side-view/native/platformer-world/heroes/hero-001/hero-001-walk-source-0c1cbfb7e747"],
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: "Pixel art assets by ElvGames", placement: "end-screen" },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  });
}

/**
 * Builds the Enchanted Library candidate cartridge without exposing it through a catalog or host.
 * @returns A title-specific candidate cartridge and its non-playable scope.
 */
export function buildEnchantedLibraryPuzzleCartridge(): EnchantedLibraryPuzzleCartridge {
  return Object.freeze({
    manifest: createManifest(),
    scope: createPuzzleCartridgeScope("enchanted-library"),
    accessibilityText: "Use keyboard arrows or a pointer drag to move, then collect the matching book twice.",
    createSession(input: unknown, complete?: (result: GameResults) => void): EnchantedLibraryPuzzleSession {
      const content = validateNonEmptyContent(input, "vocabulary").items;
      const accountant = createResultAccountant();
      const normalizeInput = createInputActionNormalizer({
        keyboard: { KeyW: "move-up", KeyA: "move-left", KeyS: "move-down", KeyD: "move-right" },
        pointerDrag: { leftAction: "move-left", rightAction: "move-right", upAction: "move-up", downAction: "move-down", threshold: 12 },
      });
      let targetIndex = 0;
      let targetProgress = 0;
      let mana = 50;
      let gameTimeMs = 0;
      let walkElapsedMs = 0;
      let status: EnchantedLibraryPuzzleSnapshot["status"] = "playing";
      let delivered: GameResults | undefined;
      const latch = createCompletionLatch<GameResults>((result) => {
        delivered = result;
        complete?.(result);
      });
      const snapshot = (): EnchantedLibraryPuzzleSnapshot => Object.freeze({
        status,
        progress: targetIndex * 2 + targetProgress,
        targetIndex,
        mana,
        gameTimeMs,
        walkFrameIndex: Math.floor((walkElapsedMs * WALK_CLIP.timing.fps) / 1000) % WALK_CLIP.frames.length,
      });
      const emitVictory = (): void => {
        const final = finalizeResult(accountant, { xpPerCorrect: 0, xpPerAccuracyPoint: 0, xpCap: 10, zeroAttemptsXp: 0 });
        const xp = final.totalAttempts === 0
          ? 0
          : Math.min(
            10,
            final.correctAnswers
              + (final.accuracy === 1 ? 2 : 0)
              + (mana / 50 >= 0.5 ? 1 : 0)
              + (gameTimeMs < 60_000 ? 1 : 0),
          );
        latch.complete({ accuracy: final.accuracy, xp, score: final.score, correctAnswers: final.correctAnswers, totalAttempts: final.totalAttempts });
      };
      return Object.freeze({
        collect(term: string): EnchantedLibraryPuzzleSnapshot {
          if (status !== "playing") return snapshot();
          const correct = term === content[targetIndex]?.term;
          accountant.recordAttempt({ correct });
          if (correct) {
            mana += 10;
            accountant.addScore(10);
            targetProgress += 1;
            if (targetProgress === 2) {
              targetProgress = 0;
              targetIndex += 1;
              if (targetIndex === content.length) {
                status = "victory";
                emitVictory();
              }
            }
          } else {
            mana = Math.max(0, mana - 5);
          }
          return snapshot();
        },
        dispatchPhysicalInput: (physical: PhysicalInputDescriptor) => Object.freeze(normalizeInput(physical).map(({ action }) => action)),
        resolveQcComposition,
        advanceWalk(elapsedMs: number): Readonly<{ column: number; row: number }> {
          if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error("Enchanted Library walk elapsed time must be a nonnegative finite number");
          walkElapsedMs += elapsedMs;
          gameTimeMs += elapsedMs;
          const frameIndex = Math.floor((walkElapsedMs * WALK_CLIP.timing.fps) / 1000) % WALK_CLIP.frames.length;
          const frame = WALK_CLIP.frames[frameIndex];
          if (!frame) throw new Error("Enchanted Library walk descriptor yielded no frame");
          return Object.freeze({ column: frame.column, row: frame.row });
        },
        walkPlayback(): EnchantedLibraryWalkPlayback {
          return Object.freeze({
            descriptorId: "enchanted-library-player-walk-v1",
            clipId: "walk",
            direction: "down",
            fps: 12,
            loop: true,
            frames: Object.freeze(WALK_CLIP.frames.map((frame) => Object.freeze({ column: frame.column, row: frame.row }))),
            claimIds: ENCHANTED_LIBRARY_RESULT_POLICY.claimIds,
          });
        },
        snapshot,
        results(): GameResults {
          if (!delivered) throw new Error("Enchanted Library has not reached a terminal result");
          return delivered;
        },
      });
    },
  });
}
