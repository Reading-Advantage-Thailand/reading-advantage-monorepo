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

/** One reachable three-lane flight position. */
export type GriffinRidersEscapeLane = "left" | "center" | "right";

/** One source-bound z-axis object emitted by a Griffin flight wave. */
export interface GriffinRidersEscapeWaveObject {
  /** Stable title-local wave object identifier. */
  readonly id: string;
  /** Logical lane occupied by the object. */
  readonly lane: GriffinRidersEscapeLane;
  /** Whether the object is a word gate or a collision hazard. */
  readonly kind: "gate" | "obstacle";
  /** Logical depth that approaches the cited collision plane at zero. */
  readonly z: number;
  /** Gate word when the object is a word gate. */
  readonly word?: string;
}

/** Immutable state from Griffin Rider's gate-and-obstacle escape loop. */
export interface GriffinRidersEscapeTraversalSnapshot {
  /** Current flight outcome. */
  readonly phase: "flying" | "escaped" | "crashed";
  /** Current rider lane. */
  readonly lane: GriffinRidersEscapeLane;
  /** Remaining hearts after wrong gates or obstacles. */
  readonly hearts: number;
  /** Number of correctly collected gate words. */
  readonly correctAnswers: number;
  /** Number of fully constructed sentence targets. */
  readonly sentencesCompleted: number;
  /** Active z-wave objects in the source-bound perspective world. */
  readonly wave: readonly GriffinRidersEscapeWaveObject[];
  /** The source-defined logical perspective anchors. */
  readonly perspective: Readonly<{ width: 390; height: 844; horizonY: 200; playerY: 700 }>;
  /** Exact source claims that bound z-wave spawning, projection, and collision. */
  readonly claimIds: readonly string[];
  /** Whether a single terminal result was emitted. */
  readonly completionCount: number;
}

/** Deterministic Griffin Rider's Escape mechanic for title-level QC. */
export interface GriffinRidersEscapeTraversalMechanic {
  /**
   * Moves the rider to one reachable lane.
   * @param lane Next rider lane.
   */
  switchLane(lane: GriffinRidersEscapeLane): void;
  /**
   * Advances source-bound wave spawning and z-axis collision resolution.
   * @param deltaMs Non-negative elapsed duration.
   */
  advanceTime(deltaMs: number): void;
  /**
   * Passes through a word gate and validates sentence order.
   * @param word Gate word encountered in the current lane.
   */
  passGate(word: string): void;
  /** Applies one obstacle collision penalty. */
  hitObstacle(): void;
  /** Returns the current immutable flight state. */
  snapshot(): GriffinRidersEscapeTraversalSnapshot;
}

/** Public-API cartridge surface for Griffin Rider's Escape. */
export interface GriffinRidersEscapeTraversalCartridge {
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
   * Resolves compact or wide composition independent from flight state.
   * @param viewport Available viewport size.
   * @returns Public APK composition.
   */
  compose(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /**
   * Creates deterministic ordered-gate flight rules.
   * @param content Sentence input used for gate word order.
   * @param complete Optional terminal result observer.
   * @returns Independent flight rules.
   */
  createMechanic(content: readonly NonEmptyContentItem[], complete?: (result: GameResults) => void): GriffinRidersEscapeTraversalMechanic;
}

const normalizeGriffinRidersEscapeInput = createInputActionNormalizer({
  keyboard: { ArrowLeft: "move-left", ArrowRight: "move-right", KeyA: "move-left", KeyD: "move-right" },
  pointerDrag: { leftAction: "move-left", rightAction: "move-right", threshold: 24 },
  pointerTap: { action: "confirm" },
});

/**
 * Resolves Griffin Rider's Escape responsive composition through the public APK API.
 * @param viewport Available viewport size.
 * @returns A supported public APK composition or its diagnostic.
 */
function composeGriffinRidersEscape(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
  return resolveResponsiveComposition({
    viewport,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    inputCapabilities: { keyboard: true, pointer: true, touch: true },
    accessibility: { textScale: 1, touchScale: 1 },
    config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  });
}

/**
 * Creates Griffin Rider's lane-switching, ordered-gate escape rules.
 * @param content Nonempty sentence input that controls gate word order.
 * @param complete Optional observer for exactly one terminal result.
 * @returns Isolated deterministic flight rules.
 * @throws When playable sentence input is empty or blank.
 */
export function createGriffinRidersEscapeTraversalMechanic(
  content: readonly NonEmptyContentItem[],
  complete?: (result: GameResults) => void,
): GriffinRidersEscapeTraversalMechanic {
  const validated = validateNonEmptyContent(content, "sentence");
  const wordsBySentence = validated.items.map((item) => item.term.trim().split(/\s+/u));
  const progression = createLanguageTargetProgression(wordsBySentence.flat());
  const sentenceEndIndexes = wordsBySentence.reduce<number[]>((ends, sentence) => {
    ends.push((ends[ends.length - 1] ?? 0) + sentence.length);
    return ends;
  }, []);
  const accountant = createResultAccountant();
  let lane: GriffinRidersEscapeLane = "center";
  let hearts = 3;
  let sentencesCompleted = 0;
  let phase: GriffinRidersEscapeTraversalSnapshot["phase"] = "flying";
  let completionCount = 0;
  let spawnTimerMs = 0;
  let waveSequence = 0;
  let objectSequence = 0;
  const wave: Array<{ id: string; lane: GriffinRidersEscapeLane; kind: "gate" | "obstacle"; z: number; word?: string }> = [];
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
  const loseHeart = (): void => {
    hearts = Math.max(0, hearts - 1);
    if (hearts === 0) {
      phase = "crashed";
      emit();
    }
  };
  const spawnWave = (): void => {
    waveSequence += 1;
    const target = progression.currentTarget;
    if (!target) return;
    const lanes: readonly GriffinRidersEscapeLane[] = ["left", "center", "right"];
    if (waveSequence % 2 === 0) {
      for (const nextLane of lanes.filter((candidate) => candidate !== "center")) {
        objectSequence += 1;
        wave.push({ id: `obstacle-${objectSequence}`, lane: nextLane, kind: "obstacle", z: 100 });
      }
      return;
    }
    for (const nextLane of lanes) {
      objectSequence += 1;
      wave.push({
        id: `gate-${objectSequence}`,
        lane: nextLane,
        kind: "gate",
        z: 100,
        word: nextLane === "center" ? target : `decoy-${waveSequence}-${nextLane}`,
      });
    }
  };

  return Object.freeze({
    switchLane(nextLane: GriffinRidersEscapeLane): void {
      if (phase === "flying") lane = nextLane;
    },
    advanceTime(deltaMs: number): void {
      if (phase !== "flying") return;
      const elapsed = Math.max(0, deltaMs);
      spawnTimerMs += elapsed;
      while (spawnTimerMs >= 2_000) {
        spawnTimerMs -= 2_000;
        spawnWave();
      }
      for (const object of wave) object.z -= 0.005 * elapsed;
      for (let index = wave.length - 1; index >= 0; index -= 1) {
        const object = wave[index]!;
        if (object.z < -5) {
          wave.splice(index, 1);
          continue;
        }
        if (object.z <= 5 && object.lane === lane) {
          wave.splice(index, 1);
          if (object.kind === "obstacle") loseHeart();
          else if (object.word) {
            const match = progression.match(object.word);
            accountant.recordAttempt({ correct: match.matched });
            if (!match.matched) loseHeart();
            else {
              accountant.addScore(100);
              if (sentenceEndIndexes.includes(progression.completedCount)) sentencesCompleted += 1;
              if (progression.isComplete) {
                phase = "escaped";
                emit();
              }
            }
          }
        }
      }
    },
    passGate(word: string): void {
      if (phase !== "flying") return;
      const match = progression.match(word);
      accountant.recordAttempt({ correct: match.matched });
      if (!match.matched) {
        loseHeart();
        return;
      }
      accountant.addScore(100);
      if (sentenceEndIndexes.includes(progression.completedCount)) sentencesCompleted += 1;
      if (progression.isComplete) {
        phase = "escaped";
        emit();
      }
    },
    hitObstacle(): void {
      if (phase === "flying") loseHeart();
    },
    snapshot(): GriffinRidersEscapeTraversalSnapshot {
      return Object.freeze({
        phase,
        lane,
        hearts,
        correctAnswers: accountant.correctAnswers,
        sentencesCompleted,
        wave: Object.freeze(wave.map((object) => Object.freeze({ ...object }))),
        perspective: Object.freeze({ width: 390 as const, height: 844 as const, horizonY: 200 as const, playerY: 700 as const }),
        claimIds: Object.freeze(["GRF-WORLD-001", "GRF-WAVE-001", "GRF-COLL-001", "GRF-TRANS-001", "GRF-RESP-001"]),
        completionCount,
      });
    },
  });
}

/** Public-API Griffin Rider's Escape cartridge with canonical selected-union assets only. */
export const GRIFFIN_RIDERS_ESCAPE_TRAVERSAL_CARTRIDGE: GriffinRidersEscapeTraversalCartridge = Object.freeze({
  manifest: validateCartridgeManifest({
    schemaVersion: 1,
    id: "griffin-riders-escape",
    title: "Griffin Rider's Escape",
    description: "Three-lane flight through ordered word gates while avoiding obstacles.",
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
    semanticAssetRequirements: getTraversalSelectedSemanticKeys("griffin-riders-escape"),
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, placement: "end-screen" },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  }),
  inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true }),
  normalizeInput: normalizeGriffinRidersEscapeInput,
  compose: composeGriffinRidersEscape,
  createMechanic: createGriffinRidersEscapeTraversalMechanic,
});
