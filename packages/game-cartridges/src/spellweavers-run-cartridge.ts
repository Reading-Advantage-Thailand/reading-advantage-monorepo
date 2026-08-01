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

/** One of the three source-bound word-orb lanes. */
export type SpellweaversRunLane = "left" | "center" | "right";

/** One visible orb in the fixed logical runner projection. */
export interface SpellweaversRunOrbSnapshot {
  /** Stable title-local orb identifier. */
  readonly id: string;
  /** Word carried by the orb. */
  readonly word: string;
  /** Lane selected when the source-bound spawn was created. */
  readonly lane: SpellweaversRunLane;
  /** Logical vertical position in the 390 by 600 projection. */
  readonly y: number;
}

/** Immutable state from Spellweaver's three-lane ordered-word runner. */
export interface SpellweaversRunTraversalSnapshot {
  /** Current playable or terminal phase. */
  readonly phase: "running" | "victory" | "defeat";
  /** Remaining mana after incorrect lane-orb collections. */
  readonly mana: number;
  /** Number of correct words collected in order. */
  readonly correctAnswers: number;
  /** Number of correctly completed sentence targets. */
  readonly sentencesCompleted: number;
  /** Consecutive correct collection count. */
  readonly combo: number;
  /** Player-selected lane used by the collection-zone predicate. */
  readonly lane: SpellweaversRunLane;
  /** The source projection has a fixed logical world rather than camera follow. */
  readonly camera: Readonly<{ mode: "fixed-logical-projection"; width: 390; height: 600 }>;
  /** Uncollected source-bound word-orb positions. */
  readonly orbs: readonly SpellweaversRunOrbSnapshot[];
  /** Exact source claims that bound spawn, projection, and collection behavior. */
  readonly claimIds: readonly string[];
  /** Whether a single terminal result was emitted. */
  readonly completionCount: number;
}

/** Deterministic Spellweaver's Run mechanic for title-level QC. */
export interface SpellweaversRunTraversalMechanic {
  /**
   * Collects a word orb from the selected lane.
   * @param word Orb word chosen by the player.
   */
  collectOrb(word: string): void;
  /**
   * Selects one of the cited three lanes for the next collection attempt.
   * @param lane Logical lane to select.
   */
  selectLane(lane: SpellweaversRunLane): void;
  /**
   * Advances source-bound spawn and downward orb movement in milliseconds.
   * @param deltaMs Non-negative elapsed duration.
   */
  advanceTime(deltaMs: number): void;
  /**
   * Collects the first orb in the selected lane only while it crosses the collection zone.
   * @returns Whether an eligible orb was collected.
   */
  collectLane(): boolean;
  /** Returns the current immutable runner state. */
  snapshot(): SpellweaversRunTraversalSnapshot;
}

/** Public-API cartridge surface for Spellweaver's Run. */
export interface SpellweaversRunTraversalCartridge {
  /** Validated public APK manifest. */
  readonly manifest: CartridgeManifest;
  /** Supported physical modalities normalized to public actions. */
  readonly inputSupport: Readonly<{ keyboard: true; pointer: true; touch: true }>;
  /**
   * Normalizes browser input without coupling rules to a renderer.
   * @param input Physical browser input.
   * @returns Bounded public APK actions.
   */
  normalizeInput(input: PhysicalInputDescriptor): readonly InputAction[];
  /**
   * Resolves compact or wide composition while retaining runner state outside layout.
   * @param viewport Available viewport size.
   * @returns Public APK composition.
   */
  compose(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition;
  /**
   * Creates the title's deterministic learning loop.
   * @param content Sentence items split into ordered orb words.
   * @param complete Optional terminal result observer.
   * @returns Independent Spellweaver rules.
   */
  createMechanic(content: readonly NonEmptyContentItem[], complete?: (result: GameResults) => void): SpellweaversRunTraversalMechanic;
}

const normalizeSpellweaversRunInput = createInputActionNormalizer({
  keyboard: { ArrowLeft: "move-left", ArrowRight: "move-right", ArrowUp: "move-up", KeyA: "move-left", KeyD: "move-right" },
  pointerDrag: { leftAction: "move-left", rightAction: "move-right", upAction: "move-up", threshold: 24 },
  pointerTap: { action: "confirm" },
});

/**
 * Resolves Spellweaver's Run responsive composition through the public APK API.
 * @param viewport Available viewport size.
 * @returns A supported public APK composition or its diagnostic.
 */
function composeSpellweaversRun(viewport: Readonly<{ width: number; height: number }>): ResponsiveComposition {
  return resolveResponsiveComposition({
    viewport,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    inputCapabilities: { keyboard: true, pointer: true, touch: true },
    accessibility: { textScale: 1, touchScale: 1 },
    config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  });
}

/**
 * Creates Spellweaver's three-lane ordered-sentence runner.
 * @param content Nonempty sentence inputs whose terms provide ordered orb words.
 * @param complete Optional observer for exactly one terminal result.
 * @returns Isolated deterministic runner rules.
 * @throws When playable sentence input is empty or blank.
 */
export function createSpellweaversRunTraversalMechanic(
  content: readonly NonEmptyContentItem[],
  complete?: (result: GameResults) => void,
): SpellweaversRunTraversalMechanic {
  const validated = validateNonEmptyContent(content, "sentence");
  const wordsBySentence = validated.items.map((item) => item.term.trim().split(/\s+/u));
  const words = wordsBySentence.flat();
  const sentenceEndIndexes = wordsBySentence.reduce<number[]>((ends, sentence) => {
    ends.push((ends.at(-1) ?? 0) + sentence.length);
    return ends;
  }, []);
  const progression = createLanguageTargetProgression(words);
  const accountant = createResultAccountant();
  let mana = 100;
  let combo = 0;
  let sentencesCompleted = 0;
  let phase: SpellweaversRunTraversalSnapshot["phase"] = "running";
  let completionCount = 0;
  let lane: SpellweaversRunLane = "center";
  let spawnTimerMs = 0;
  let orbSequence = 0;
  const orbs: Array<{ id: string; word: string; lane: SpellweaversRunLane; y: number }> = [];
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
  const resolveCollection = (word: string): void => {
    const match = progression.match(word);
    accountant.recordAttempt({ correct: match.matched });
    if (!match.matched) {
      mana = Math.max(0, mana - 20);
      combo = 0;
      if (mana === 0) {
        phase = "defeat";
        emit();
      }
      return;
    }
    accountant.addScore(100 + combo * 25);
    combo += 1;
    if (sentenceEndIndexes.includes(progression.completedCount)) sentencesCompleted += 1;
    if (progression.isComplete) {
      phase = "victory";
      emit();
    }
  };

  return Object.freeze({
    collectOrb(word: string): void {
      if (phase !== "running") return;
      resolveCollection(word);
    },
    selectLane(nextLane: SpellweaversRunLane): void {
      if (phase === "running") lane = nextLane;
    },
    advanceTime(deltaMs: number): void {
      if (phase !== "running") return;
      const elapsed = Math.max(0, deltaMs);
      spawnTimerMs += elapsed;
      while (spawnTimerMs >= 2_000 && progression.currentTarget) {
        spawnTimerMs -= 2_000;
        if (!orbs.some((orb) => orb.word === progression.currentTarget)) {
          orbSequence += 1;
          orbs.push({ id: `orb-${orbSequence}`, word: progression.currentTarget, lane, y: 300 });
        }
      }
      for (const orb of orbs) orb.y += (90 / 1_000) * elapsed;
      for (let index = orbs.length - 1; index >= 0; index -= 1) {
        if (orbs[index]!.y > 680) orbs.splice(index, 1);
      }
    },
    collectLane(): boolean {
      if (phase !== "running") return false;
      const orbIndex = orbs.findIndex((orb) => orb.lane === lane && orb.y >= 520 && orb.y <= 600);
      if (orbIndex < 0) return false;
      const [orb] = orbs.splice(orbIndex, 1);
      if (orb) resolveCollection(orb.word);
      return true;
    },
    snapshot(): SpellweaversRunTraversalSnapshot {
      return Object.freeze({
        phase,
        mana,
        correctAnswers: accountant.correctAnswers,
        sentencesCompleted,
        combo,
        lane,
        camera: Object.freeze({ mode: "fixed-logical-projection" as const, width: 390 as const, height: 600 as const }),
        orbs: Object.freeze(orbs.map((orb) => Object.freeze({ ...orb }))),
        claimIds: Object.freeze(["SW-MOVE-002", "SW-MOVE-003", "SW-STATE-005", "SW-COLL-001", "SW-WORLD-002"]),
        completionCount,
      });
    },
  });
}

/** Public-API Spellweaver's Run cartridge with canonical selected-union assets only. */
export const SPELLWEAVERS_RUN_TRAVERSAL_CARTRIDGE: SpellweaversRunTraversalCartridge = Object.freeze({
  manifest: validateCartridgeManifest({
    schemaVersion: 1,
    id: "spellweavers-run",
    title: "Spellweaver's Run",
    description: "Three-lane sentence-construction runner with mana consequences.",
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
    semanticAssetRequirements: getTraversalSelectedSemanticKeys("spellweavers-run"),
    responsive: { profiles: ["compact", "wide"], compactStrategy: "reflow", wideStrategy: "panel", statePreservation: "capture-recompose-restore" },
    attributionRegistration: { requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, placement: "end-screen" },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  }),
  inputSupport: Object.freeze({ keyboard: true, pointer: true, touch: true }),
  normalizeInput: normalizeSpellweaversRunInput,
  compose: composeSpellweaversRun,
  createMechanic: createSpellweaversRunTraversalMechanic,
});
