import { ACCEPTED_STANDARD_ASSET_RELEASE } from "@reading-advantage/advantage-play-kit/assets";
import { DEVELOPER_KIT_API_VERSION } from "@reading-advantage/advantage-play-kit/compatibility";
import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
  type ResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  ACCEPTED_STANDARD_PACK_BINDING,
  validateCartridgeManifest,
  type CartridgeManifest,
} from "@reading-advantage/advantage-play-kit/scaffolding";
import {
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
  type InputAction,
  type NonEmptyContentItem,
  type PhysicalInputDescriptor,
} from "@reading-advantage/advantage-play-kit/systems";
import type { GameResults } from "@reading-advantage/game-contracts";

import { getTraversalSelectedSemanticKeys } from "./traversal-suitability.js";

/** One direction accepted by the source-bound maze movement adapter. */
export interface LabyrinthGoblinKingDirection {
  /** Horizontal direction from -1 through 1. */
  readonly x: number;
  /** Vertical direction from -1 through 1. */
  readonly y: number;
}

/** Immutable state from the Goblin King ordered-orb maze loop. */
export interface LabyrinthGoblinKingTraversalSnapshot {
  /** Current maze outcome. */
  readonly phase: "exploring" | "victory" | "defeat";
  /** Remaining lives after out-of-order orbs or goblin contact. */
  readonly lives: number;
  /** Number of correctly collected ordered words. */
  readonly correctAnswers: number;
  /** Whether completing the sentence enabled the heroic aura. */
  readonly heroicAura: boolean;
  /** Whether the heroic aura makes goblins flee. */
  readonly goblinsFlee: boolean;
  /** Deterministic source-bound maze dimensions. */
  readonly maze: Readonly<{ columns: 11; rows: 15; tileSize: 32 }>;
  /** Current sentence index after a heroic-aura transition. */
  readonly sentenceIndex: number;
  /** Number of goblins removed while the heroic aura is active. */
  readonly goblinsEaten: number;
  /** Exact source claims that bound maze, orb, goblin, and aura behavior. */
  readonly claimIds: readonly string[];
  /** Whether a single terminal result was emitted. */
  readonly completionCount: number;
}

/** Deterministic Labyrinth of the Goblin King mechanic for title-level QC. */
export interface LabyrinthGoblinKingTraversalMechanic {
  /**
   * Collects an orb and verifies its sentence-order position.
   * @param word Orb word selected by the player.
   */
  collectOrb(word: string): void;
  /**
   * Moves through the bounded source maze without crossing its declared walls.
   * @param direction Desired movement direction.
   * @param deltaMs Non-negative duration to advance.
   */
  move(direction: LabyrinthGoblinKingDirection, deltaMs: number): void;
  /**
   * Advances the source-bound heroic-aura duration.
   * @param deltaMs Non-negative duration to advance.
   */
  advanceTime(deltaMs: number): void;
  /** Applies a goblin collision when the heroic aura is inactive. */
  encounterGoblin(): void;
  /** Returns the current immutable maze state. */
  snapshot(): LabyrinthGoblinKingTraversalSnapshot;
}

/** Public-API cartridge surface for Labyrinth of the Goblin King. */
export interface LabyrinthGoblinKingTraversalCartridge {
  /** Validated public APK manifest. */
  readonly manifest: CartridgeManifest;
  /** Supported physical modalities normalized through public APK input APIs. */
  readonly inputSupport: Readonly<{ keyboard: true; pointer: true; touch: true }>;
  /**
   * Normalizes browser input into bounded actions.
   * @param input Physical browser input descriptor.
   * @returns Public APK actions.
   */
  normalizeInput(input: PhysicalInputDescriptor): readonly InputAction[];
  /**
   * Resolves compact or wide composition independent from maze state.
   * @param viewport Available viewport size.
   * @returns Public APK composition.
   */
  compose(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /**
   * Creates deterministic ordered-orb maze rules.
   * @param content Sentence input used for orb word order.
   * @param complete Optional terminal result observer.
   * @returns Independent maze rules.
   */
  createMechanic(content: readonly NonEmptyContentItem[], complete?: (result: GameResults) => void): LabyrinthGoblinKingTraversalMechanic;
}

const normalizeLabyrinthGoblinKingInput = createInputActionNormalizer({
  keyboard: { ArrowLeft: "move-left", ArrowRight: "move-right", ArrowUp: "move-up", ArrowDown: "move-down", KeyA: "move-left", KeyD: "move-right", KeyW: "move-up", KeyS: "move-down" },
  pointerDrag: { leftAction: "move-left", rightAction: "move-right", upAction: "move-up", downAction: "move-down", threshold: 24 },
  pointerTap: { action: "confirm" },
});

/**
 * Resolves Labyrinth of the Goblin King responsive composition through the public APK API.
 * @param viewport Available viewport size.
 * @returns A supported public APK composition or its diagnostic.
 */
function composeLabyrinthGoblinKing(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
  return resolveResponsiveComposition({
    viewport,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    inputCapabilities: { keyboard: true, pointer: true, touch: true },
    accessibility: { textScale: 1, touchScale: 1 },
    config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  });
}

/**
 * Creates Labyrinth of the Goblin King's ordered-orb maze rules.
 * @param content Nonempty sentence input that controls orb order.
 * @param complete Optional observer for exactly one terminal result.
 * @returns Isolated deterministic maze rules.
 * @throws When playable sentence input is empty or blank.
 */
export function createLabyrinthGoblinKingTraversalMechanic(
  content: readonly NonEmptyContentItem[],
  complete?: (result: GameResults) => void,
): LabyrinthGoblinKingTraversalMechanic {
  const validated = validateNonEmptyContent(content, "sentence");
  const accountant = createResultAccountant();
  const wordsBySentence = validated.items.map((item) => item.term.trim().split(/\s+/u));
  let lives = 3;
  let heroicAura = false;
  let heroicAuraMs = 0;
  let sentenceIndex = 0;
  let wordIndex = 0;
  let player = { x: 16, y: 48 };
  let goblinsEaten = 0;
  let phase: LabyrinthGoblinKingTraversalSnapshot["phase"] = "exploring";
  let completionCount = 0;
  const completion = createCompletionLatch<GameResults>((result) => {
    completionCount += 1;
    complete?.(result);
  });
  const emit = (): void => {
    completion.complete(finalizeResult(accountant, {
      xpPerCorrect: 2,
      xpPerAccuracyPoint: 8,
      zeroAttemptsXp: 0,
    }));
  };
  const loseLife = (): void => {
    lives = Math.max(0, lives - 1);
    if (lives === 0) {
      phase = "defeat";
      emit();
    }
  };
  const isWall = (x: number, y: number): boolean => {
    const column = Math.floor(x / 32);
    const row = Math.floor(y / 32);
    if (column < 0 || column >= 11 || row < 0 || row >= 15) return true;
    if ((column === 0 && row === 1) || (column === 10 && row === 13)) return false;
    return column === 0 || row === 0 || column === 10 || row === 14 || (column % 2 === 0 && row % 2 === 0);
  };

  return Object.freeze({
    collectOrb(word: string): void {
      if (phase !== "exploring") return;
      const target = wordsBySentence[sentenceIndex]?.[wordIndex];
      const correct = word === target;
      accountant.recordAttempt({ correct });
      if (!correct) {
        loseLife();
        return;
      }
      accountant.addScore(100);
      wordIndex += 1;
      const sentenceComplete = wordIndex === wordsBySentence[sentenceIndex]?.length;
      if (sentenceComplete) {
        heroicAura = true;
        heroicAuraMs = 6_000;
        if (sentenceIndex === wordsBySentence.length - 1) {
          phase = "victory";
          emit();
        } else {
          sentenceIndex += 1;
          wordIndex = 0;
        }
      }
    },
    move(direction: LabyrinthGoblinKingDirection, deltaMs: number): void {
      if (phase !== "exploring") return;
      const distance = Math.max(0, deltaMs) / 1_000 * 96;
      const candidate = { x: player.x + direction.x * distance, y: player.y + direction.y * distance };
      if (!isWall(candidate.x, candidate.y)) player = candidate;
    },
    advanceTime(deltaMs: number): void {
      if (phase !== "exploring" || !heroicAura) return;
      heroicAuraMs = Math.max(0, heroicAuraMs - Math.max(0, deltaMs));
      if (heroicAuraMs === 0) heroicAura = false;
    },
    encounterGoblin(): void {
      if (phase !== "exploring") return;
      if (heroicAura) {
        goblinsEaten += 1;
        return;
      }
      loseLife();
    },
    snapshot(): LabyrinthGoblinKingTraversalSnapshot {
      return Object.freeze({
        phase,
        lives,
        correctAnswers: accountant.correctAnswers,
        heroicAura,
        goblinsFlee: heroicAura,
        maze: Object.freeze({ columns: 11 as const, rows: 15 as const, tileSize: 32 as const }),
        sentenceIndex,
        goblinsEaten,
        claimIds: Object.freeze(["LGK-MAZE-001", "LGK-MOVE-001", "LGK-COLL-001", "LGK-ORB-001", "LGK-TRANS-001", "LGK-TRANS-002", "LGK-GOBLIN-001"]),
        completionCount,
      });
    },
  });
}

/** Public-API Labyrinth of the Goblin King cartridge with canonical selected-union assets only. */
export const LABYRINTH_GOBLIN_KING_TRAVERSAL_CARTRIDGE: LabyrinthGoblinKingTraversalCartridge = Object.freeze({
  manifest: validateCartridgeManifest({
    schemaVersion: 1,
    id: "labyrinth-goblin-king",
    title: "Labyrinth of the Goblin King",
    description: "Ordered-orb maze traversal that grants a heroic aura at sentence completion.",
    version: "0.1.0",
    runtimeApiVersion: DEVELOPER_KIT_API_VERSION,
    inputMode: "sentence",
    capabilities: [
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
    ],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    semanticAssetRequirements: getTraversalSelectedSemanticKeys("labyrinth-goblin-king"),
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, placement: "end-screen" },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  }),
  inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true }),
  normalizeInput: normalizeLabyrinthGoblinKingInput,
  compose: composeLabyrinthGoblinKing,
  createMechanic: createLabyrinthGoblinKingTraversalMechanic,
});
