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
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
  type InputAction,
  type NonEmptyContentItem,
  type PhysicalInputDescriptor,
} from "@reading-advantage/advantage-play-kit/systems";
import type { GameResults } from "@reading-advantage/game-contracts";

import { getTraversalSelectedSemanticKeys } from "./traversal-suitability.js";

/** One bounded position in the cited Shadow Gate logical world. */
export interface ShadowGateDungeonPoint {
  /** Horizontal logical coordinate. */
  readonly x: number;
  /** Vertical logical coordinate. */
  readonly y: number;
}

/** Immutable state from Shadow Gate Dungeon's stealth crystal traversal loop. */
export interface ShadowGateDungeonTraversalSnapshot {
  /** Current escape state. */
  readonly phase: "exploring" | "escaped" | "captured";
  /** Remaining health after wrong crystals or creature contact. */
  readonly health: number;
  /** Number of crystals collected in sentence order. */
  readonly correctAnswers: number;
  /** Whether ordered word crystals opened the exit gate. */
  readonly gateUnlocked: boolean;
  /** Whether a creature encounter was recorded. */
  readonly creatureDetected: boolean;
  /** Source-bound player position inside the 390 by 700 world. */
  readonly player: ShadowGateDungeonPoint;
  /** Source-bound patrol/chase creature position. */
  readonly creature: ShadowGateDungeonPoint;
  /** Current source-defined creature behavior state. */
  readonly creatureMode: "patrol" | "chase";
  /** Exact source claims that bound movement, chase, and penalties. */
  readonly claimIds: readonly string[];
  /** Whether a single terminal result was emitted. */
  readonly completionCount: number;
}

/** Deterministic Shadow Gate Dungeon mechanic for title-level QC. */
export interface ShadowGateDungeonTraversalMechanic {
  /**
   * Collects a crystal and validates it against the next sentence word.
   * @param word Crystal word selected by the player.
   */
  collectCrystal(word: string): void;
  /**
   * Moves the player at the cited speed while clamping to source world bounds.
   * @param velocity Unit directional movement vector.
   * @param deltaMs Non-negative duration to move.
   */
  move(velocity: ShadowGateDungeonPoint, deltaMs: number): void;
  /**
   * Advances creature patrol/chase and applies a source-bound contact collision.
   * @param deltaMs Non-negative world duration.
   */
  advanceTime(deltaMs: number): void;
  /**
   * Sets a player position for deterministic QC collision probes.
   * @param position Bounded logical player position.
   */
  setPlayerPosition(position: ShadowGateDungeonPoint): void;
  /**
   * Sets a creature position for deterministic QC chase and collision probes.
   * @param position Bounded logical creature position.
   */
  setCreaturePosition(position: ShadowGateDungeonPoint): void;
  /** Applies the legacy creature-contact penalty. */
  encounterCreature(): void;
  /** Returns the current immutable dungeon state. */
  snapshot(): ShadowGateDungeonTraversalSnapshot;
}

/** Public-API cartridge surface for Shadow Gate Dungeon. */
export interface ShadowGateDungeonTraversalCartridge {
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
   * Resolves compact or wide composition independent from dungeon state.
   * @param viewport Available viewport size.
   * @returns Public APK composition.
   */
  compose(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /**
   * Creates the deterministic ordered-crystal mechanic.
   * @param content Sentence input used for crystal word order.
   * @param complete Optional terminal result observer.
   * @returns Independent dungeon rules.
   */
  createMechanic(content: readonly NonEmptyContentItem[], complete?: (result: GameResults) => void): ShadowGateDungeonTraversalMechanic;
}

const normalizeShadowGateDungeonInput = createInputActionNormalizer({
  keyboard: { ArrowLeft: "move-left", ArrowRight: "move-right", ArrowUp: "move-up", ArrowDown: "move-down", KeyW: "move-up", KeyS: "move-down" },
  pointerDrag: { leftAction: "move-left", rightAction: "move-right", upAction: "move-up", downAction: "move-down", threshold: 24 },
  pointerTap: { action: "confirm" },
});

/**
 * Resolves Shadow Gate Dungeon responsive composition through the public APK API.
 * @param viewport Available viewport size.
 * @returns A supported public APK composition or its diagnostic.
 */
function composeShadowGateDungeon(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
  return resolveResponsiveComposition({
    viewport,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    inputCapabilities: { keyboard: true, pointer: true, touch: true },
    accessibility: { textScale: 1, touchScale: 1 },
    config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  });
}

/**
 * Creates Shadow Gate Dungeon's ordered-crystal escape rules.
 * @param content Nonempty sentence input that controls crystal order.
 * @param complete Optional observer for exactly one terminal result.
 * @returns Isolated deterministic dungeon rules.
 * @throws When playable sentence input is empty or blank.
 */
export function createShadowGateDungeonTraversalMechanic(
  content: readonly NonEmptyContentItem[],
  complete?: (result: GameResults) => void,
): ShadowGateDungeonTraversalMechanic {
  const validated = validateNonEmptyContent(content, "sentence");
  const progression = createLanguageTargetProgression(validated.items.flatMap((item) => item.term.trim().split(/\s+/u)));
  const accountant = createResultAccountant();
  let health = 100;
  let creatureDetected = false;
  let player = { x: 12, y: 12 };
  let creature = { x: 195, y: 350 };
  let creatureMode: "patrol" | "chase" = "patrol";
  let invincibleMs = 0;
  let gameTimeMs = 0;
  let phase: ShadowGateDungeonTraversalSnapshot["phase"] = "exploring";
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
  const applyDamage = (amount: number): void => {
    health = Math.max(0, health - amount);
    if (health === 0) {
      phase = "captured";
      emit();
    }
  };
  const clampPosition = (position: ShadowGateDungeonPoint): ShadowGateDungeonPoint => Object.freeze({
    x: Math.min(378, Math.max(12, position.x)),
    y: Math.min(688, Math.max(12, position.y)),
  });
  const distance = (left: ShadowGateDungeonPoint, right: ShadowGateDungeonPoint): number => (
    Math.hypot(left.x - right.x, left.y - right.y)
  );

  return Object.freeze({
    collectCrystal(word: string): void {
      if (phase !== "exploring") return;
      const match = progression.match(word);
      accountant.recordAttempt({ correct: match.matched });
      if (!match.matched) {
        applyDamage(20);
        return;
      }
      accountant.addScore(100);
      if (progression.isComplete) {
        phase = "escaped";
        emit();
      }
    },
    move(velocity: ShadowGateDungeonPoint, deltaMs: number): void {
      if (phase !== "exploring") return;
      const elapsed = Math.max(0, deltaMs) / 1_000;
      player = clampPosition({ x: player.x + velocity.x * 200 * elapsed, y: player.y + velocity.y * 200 * elapsed });
    },
    advanceTime(deltaMs: number): void {
      if (phase !== "exploring") return;
      const elapsed = Math.max(0, deltaMs);
      gameTimeMs += elapsed;
      invincibleMs = Math.max(0, invincibleMs - elapsed);
      const separation = distance(player, creature);
      if (separation < 75) {
        creatureMode = "chase";
        creatureDetected = true;
      } else if (creatureMode === "chase" && separation >= 75) {
        creatureMode = "patrol";
      }
      if (creatureMode === "patrol") {
        const radians = (gameTimeMs / 1_000) * 0.8;
        creature = { x: 195 + Math.cos(radians) * 70, y: 350 + Math.sin(radians) * 70 };
      }
      if (invincibleMs === 0 && distance(player, creature) < 26) {
        invincibleMs = 500;
        applyDamage(25);
      }
    },
    setPlayerPosition(position: ShadowGateDungeonPoint): void {
      if (phase === "exploring") player = clampPosition(position);
    },
    setCreaturePosition(position: ShadowGateDungeonPoint): void {
      if (phase === "exploring") creature = clampPosition(position);
    },
    encounterCreature(): void {
      if (phase !== "exploring") return;
      creatureDetected = true;
      creatureMode = "chase";
      applyDamage(25);
    },
    snapshot(): ShadowGateDungeonTraversalSnapshot {
      return Object.freeze({
        phase,
        health,
        correctAnswers: accountant.correctAnswers,
        gateUnlocked: progression.isComplete,
        creatureDetected,
        player: Object.freeze({ ...player }),
        creature: Object.freeze({ ...creature }),
        creatureMode,
        claimIds: Object.freeze(["SGD-MOVE-001", "SGD-STEALTH-001", "SGD-STEALTH-002", "SGD-STEALTH-003", "SGD-COLL-001", "SGD-PROG-001"]),
        completionCount,
      });
    },
  });
}

/** Public-API Shadow Gate Dungeon cartridge with canonical selected-union assets only. */
export const SHADOW_GATE_DUNGEON_TRAVERSAL_CARTRIDGE: ShadowGateDungeonTraversalCartridge = Object.freeze({
  manifest: validateCartridgeManifest({
    schemaVersion: 1,
    id: "shadow-gate-dungeon",
    title: "Shadow Gate Dungeon",
    description: "Stealth traversal through ordered sentence crystals to unlock an exit gate.",
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
    semanticAssetRequirements: getTraversalSelectedSemanticKeys("shadow-gate-dungeon"),
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, placement: "end-screen" },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  }),
  inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true }),
  normalizeInput: normalizeShadowGateDungeonInput,
  compose: composeShadowGateDungeon,
  createMechanic: createShadowGateDungeonTraversalMechanic,
});
