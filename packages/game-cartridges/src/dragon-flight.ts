import {
  gameResultsSchema,
  vocabularyInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  resolveAssetBinding,
  validateNonEmptyContent,
  type APKInputController,
  type AnswerChoiceAudioController,
  type CartridgeGameConfigContext,
  type CompletionDelivery,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";
import {
  createFlightParallax,
  destroyFlightParallax,
  preloadFlightParallax,
  tickFlightParallax,
  type FlightParallaxLayers,
} from "./flight-parallax.js";

/** Stable public identifier for the Dragon Flight cartridge. */
export const DRAGON_FLIGHT_ID = "dragon-flight" as const;

/** Stable public identifier for the Dragon Rider compatibility route. */
export const DRAGON_RIDER_ID = "dragon-rider" as const;

/** Default flight time before the guardian arrives. */
export const DRAGON_FLIGHT_DURATION_MS = 30_000;

/** Default travel time for one moving gate pair. */
export const DRAGON_FLIGHT_GATE_TRAVEL_MS = 6_500;

/** Default duration of the final guardian encounter. */
export const DRAGON_FLIGHT_GUARDIAN_MS = 2_400;

/** Health removed from the guardian before the flock wins. */
export const DRAGON_FLIGHT_GUARDIAN_HEALTH = 6;

/** Phaser canvas size used by Dragon Flight before host scaling. */
export const DRAGON_FLIGHT_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Keyboard bindings accepted by the Dragon Flight gate selector. */
export const DRAGON_FLIGHT_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  ArrowRight: "move-right",
  KeyA: "move-left",
  KeyD: "move-right",
});

/** Two selectable gate positions in the Dragon Flight scene. */
export type DragonFlightGate = "left" | "right";

/** Terminal or active phase in the Dragon Flight session. */
export type DragonFlightPhase = "gate" | "guardian" | "complete";

/** Visible translation choices for the current vocabulary target. */
export interface DragonFlightGateOptions {
  /** Label shown on the left gate. */
  readonly left: string;
  /** Label shown on the right gate. */
  readonly right: string;
  /** Correct gate for the current target. */
  readonly correctChoice: DragonFlightGate;
  /** Every truthful correct gate for the current target. */
  readonly correctChoices: readonly DragonFlightGate[];
  /** Original content position for the left English answer. */
  readonly leftItemPosition: number;
  /** Original content position for the right English answer. */
  readonly rightItemPosition: number;
}

/** Optional deterministic timing and layout values for one flight. */
export interface DragonFlightControllerOptions {
  /** Stable seed used for answer placement. */
  readonly seed?: number;
  /** Flight time before the guardian arrives. */
  readonly durationMs?: number;
  /** Travel time for one gate pair. */
  readonly gateTravelMs?: number;
  /** Duration of the guardian encounter. */
  readonly guardianDurationMs?: number;
}

/** Immutable state exposed by the transport-independent Dragon Flight rules. */
export interface DragonFlightSnapshot {
  /** Current game phase. */
  readonly phase: DragonFlightPhase;
  /** Index of the vocabulary target shown to the player. */
  readonly targetIndex: number;
  /** Index of the moving gate encounter. */
  readonly encounterIndex: number;
  /** Target queued for the next gate encounter. */
  readonly pendingTargetIndex: number | null;
  /** Current source-language prompt. */
  readonly prompt: string;
  /** Current gate labels and correct gate. */
  readonly gates: DragonFlightGateOptions;
  /** Normalized gate travel from the horizon to the dragon. */
  readonly gateProgress: number;
  /** Remaining flight time before the guardian arrives. */
  readonly timeRemainingMs: number;
  /** Normalized guardian encounter progress. */
  readonly guardianProgress: number;
  /** Current guardian health. */
  readonly guardianHealth: number;
  /** Current number of dragons in the visible flock. */
  readonly flockSize: number;
  /** Selected lane during the current encounter. */
  readonly selectedGate: DragonFlightGate | null;
  /** Whether this moving gate pair already accepted a selection. */
  readonly selectionLocked: boolean;
  /** Most recent accepted choice result. */
  readonly lastOutcome: "correct" | "incorrect" | null;
  /** Final guardian outcome after resolution. */
  readonly outcome: "victory" | "defeat" | null;
  /** Number of correct gate choices. */
  readonly correctAnswers: number;
  /** Number of all gate attempts. */
  readonly totalAttempts: number;
  /** Current game score. */
  readonly score: number;
  /** Whether the session has been destroyed by its scene lifecycle. */
  readonly destroyed: boolean;
}

/** Result returned after one attempted gate choice. */
export interface DragonFlightChoiceResult {
  /** Whether the choice was accepted for the current session. */
  readonly accepted: boolean;
  /** Whether the selected gate was correct. */
  readonly correct: boolean;
  /** Whether the vocabulary target advanced. */
  readonly progressed: boolean;
  /** Whether the session reached its terminal state. */
  readonly completed: boolean;
  /** The terminal result on the first completing choice. */
  readonly result?: GameResults;
  /** State after applying the choice. */
  readonly snapshot: DragonFlightSnapshot;
}

/** Transport-independent Dragon Flight rules and lifecycle controls. */
export interface DragonFlightController {
  /** Returns the current immutable game state. */
  snapshot(): DragonFlightSnapshot;
  /** Applies one gate choice for the current moving gate encounter. */
  choose(gate: DragonFlightGate): DragonFlightChoiceResult;
  /** Selects a flight lane without resolving the moving gate encounter. */
  steer(gate: DragonFlightGate): void;
  /** Advances moving gates, the flight timer, and the guardian. */
  advance(deltaMs: number): void;
  /** Captures state for a responsive Phaser reflow. */
  capture(): DragonFlightSnapshot;
  /** Restores a state captured before a responsive Phaser reflow. */
  restore(snapshot: DragonFlightSnapshot): void;
  /** Seals the session so a destroyed scene cannot emit a result later. */
  destroy(): void;
}

/** Minimal Phaser graphics surface used by the procedural scene. */
interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  setDepth?(depth: number): this;
  destroy(): void;
}

/** Minimal Phaser text surface used by the procedural scene. */
interface PhaserTextLike {
  readonly width?: number;
  readonly height?: number;
  setOrigin?(x: number, y: number): this;
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  setFontSize?(size: number | string): this;
  setWordWrapWidth?(width: number, useAdvancedWrap?: boolean): this;
  setDepth?(depth: number): this;
  destroy(): void;
}

/** Minimal Phaser image surface used by flight art. */
interface PhaserImageLike {
  setOrigin?(x: number, y: number): this;
  setDisplaySize?(width: number, height: number): this;
  setDepth?(depth: number): this;
  setPosition?(x: number, y: number): this;
  setAlpha?(alpha: number): this;
  setFrame?(frame: number): this;
  setTileScale?(x: number, y?: number): this;
  setTilePosition?(x: number, y: number): this;
  tilePositionY?: number;
  destroy(): void;
}

/** Minimal Phaser canvas surface needed for pointer coordinate conversion. */
interface PhaserCanvasLike {
  getBoundingClientRect?(): { readonly left: number; readonly top?: number; readonly width: number; readonly height?: number };
}

/** Minimal Phaser scene surface used by this cartridge. */
interface PhaserSceneLike {
  load?: {
    image?(key: string, url: string): unknown;
    spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
  };
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
    image?(x: number, y: number, key: string, frame?: number): PhaserImageLike;
    sprite?(x: number, y: number, key: string, frame?: number): PhaserImageLike;
    tileSprite?(x: number, y: number, width: number, height: number, key: string): PhaserImageLike;
  };
  events?: {
    once(event: string, listener: () => void): void;
  };
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

/** Resources owned by one active Dragon Flight scene. */
interface SceneResources {
  readonly graphics: PhaserGraphicsLike;
  readonly overlay: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly leftGate: PhaserTextLike;
  readonly rightGate: PhaserTextLike;
  readonly leftAudio: PhaserTextLike;
  readonly rightAudio: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  ground?: PhaserImageLike;
  dragons: PhaserImageLike[];
  guardian?: PhaserImageLike;
  leftGateArt?: PhaserImageLike;
  rightGateArt?: PhaserImageLike;
  groundWidth: number;
  groundHeight: number;
}

/** Current Phaser scene options passed to the renderer. */
interface DragonFlightSceneContext {
  readonly id: typeof DRAGON_FLIGHT_ID | typeof DRAGON_RIDER_ID;
  readonly title: string;
  readonly controller: DragonFlightController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly totalTargets: number;
  readonly sessionMode: CartridgeGameConfigContext["sessionMode"];
  readonly edition: RuntimeEdition;
  readonly answerAudio?: AnswerChoiceAudioController;
}

function seededUnit(seed: number, index: number): number {
  let value = (Math.trunc(seed) + Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
}

/**
 * Creates the reusable Dragon Flight rules for one vocabulary array.
 * @param input Vocabulary supplied by the host.
 * @param deliver Completion callback for the five-field result.
 * @param options Optional deterministic timing and placement values.
 * @returns A transport-independent timed flight controller.
 */
export function createDragonFlightController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
  options: DragonFlightControllerOptions = {},
): DragonFlightController {
  const parsedInput = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "vocabulary");
  const items = content.items;
  const seed = Number.isFinite(options.seed) ? Math.trunc(options.seed ?? 0) : 0;
  const durationMs = Math.max(1, options.durationMs ?? DRAGON_FLIGHT_DURATION_MS);
  const gateTravelMs = Math.max(1, options.gateTravelMs ?? DRAGON_FLIGHT_GATE_TRAVEL_MS);
  const guardianDurationMs = Math.max(1, options.guardianDurationMs ?? DRAGON_FLIGHT_GUARDIAN_MS);
  let accountant = createResultAccountant();
  const completion = createCompletionLatch(deliver);
  let phase: DragonFlightPhase = "gate";
  let targetIndex = 0;
  let pendingTargetIndex: number | null = null;
  let encounterIndex = 0;
  let flightElapsedMs = 0;
  let encounterElapsedMs = 0;
  let guardianElapsedMs = 0;
  let guardianRound = 0;
  let guardianHealth = DRAGON_FLIGHT_GUARDIAN_HEALTH;
  let flockSize = 1;
  let selectedGate: DragonFlightGate | null = null;
  let selectionLocked = false;
  let lastOutcome: "correct" | "incorrect" | null = null;
  let outcome: "victory" | "defeat" | null = null;
  let destroyed = false;

  const optionsFor = (index: number): DragonFlightGateOptions => {
    const current = items[index]!;
    const equivalentTerms = items
      .map((item, itemPosition) => ({ item, itemPosition }))
      .filter(({ item }, itemPosition, entries) => item.translation === current.translation
        && entries.findIndex(({ item: candidate }) => candidate.term === item.term) === itemPosition);
    const distractors = items.map((item, itemPosition) => ({ item, itemPosition }))
      .filter(({ item }) => item.translation !== current.translation);
    if (distractors.length === 0) {
      const left = equivalentTerms[0] ?? { item: current, itemPosition: index };
      const right = equivalentTerms[1] ?? left;
      return Object.freeze({ left: left.item.term, right: right.item.term, leftItemPosition: left.itemPosition, rightItemPosition: right.itemPosition, correctChoice: "left", correctChoices: Object.freeze(["left", "right"] as const) });
    }
    const distractorIndex = Math.floor(seededUnit(seed ^ 0x51f15e, encounterIndex) * distractors.length);
    const distractor = distractors[distractorIndex] ?? distractors[0]!;
    const correctChoice: DragonFlightGate = seededUnit(seed, encounterIndex) < 0.5 ? "left" : "right";
    return Object.freeze({
      left: correctChoice === "left" ? current.term : distractor.item.term,
      right: correctChoice === "right" ? current.term : distractor.item.term,
      leftItemPosition: correctChoice === "left" ? index : distractor.itemPosition,
      rightItemPosition: correctChoice === "right" ? index : distractor.itemPosition,
      correctChoice,
      correctChoices: Object.freeze([correctChoice]),
    });
  };

  const snapshot = (): DragonFlightSnapshot => {
    const current = items[targetIndex] ?? items[0]!;
    return Object.freeze({
      phase,
      targetIndex,
      encounterIndex,
      pendingTargetIndex,
      prompt: current.translation,
      gates: optionsFor(targetIndex),
      gateProgress: Math.min(1, encounterElapsedMs / gateTravelMs),
      timeRemainingMs: Math.max(0, durationMs - flightElapsedMs),
      guardianProgress: Math.min(1, guardianElapsedMs / guardianDurationMs),
      guardianHealth,
      flockSize,
      selectedGate,
      selectionLocked,
      lastOutcome,
      outcome,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      destroyed,
    });
  };

  const restore = (state: DragonFlightSnapshot): void => {
    if (destroyed) return;
    if (!Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex >= items.length) {
      throw new Error("Dragon Flight state target index is invalid");
    }
    if (state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts) {
      throw new Error("Dragon Flight state result counters are invalid");
    }
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
    phase = state.phase;
    targetIndex = state.targetIndex;
    pendingTargetIndex = state.pendingTargetIndex;
    encounterIndex = state.encounterIndex;
    flightElapsedMs = durationMs - state.timeRemainingMs;
    encounterElapsedMs = state.gateProgress * gateTravelMs;
    guardianElapsedMs = state.guardianProgress * guardianDurationMs;
    guardianRound = Math.floor(state.guardianProgress * 4);
    guardianHealth = state.guardianHealth;
    flockSize = state.flockSize;
    selectedGate = state.selectedGate;
    selectionLocked = state.selectionLocked;
    lastOutcome = state.lastOutcome;
    outcome = state.outcome;
    destroyed = state.destroyed;
  };

  const finish = (finalOutcome: "victory" | "defeat"): void => {
    if (phase === "complete" || destroyed) return;
    phase = "complete";
    outcome = finalOutcome;
    const result = gameResultsSchema.parse(finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }));
    completion.complete(result);
  };

  return Object.freeze({
    snapshot,
    steer(gate: DragonFlightGate): void {
      if (destroyed || phase !== "gate" || selectionLocked) return;
      selectedGate = gate;
    },
    choose(gate: DragonFlightGate): DragonFlightChoiceResult {
      const before = snapshot();
      if (destroyed || phase !== "gate" || selectionLocked) {
        return Object.freeze({
          accepted: false,
          correct: false,
          progressed: false,
          completed: phase === "complete",
          snapshot: before,
        });
      }

      const correct = before.gates.correctChoices.includes(gate);
      selectionLocked = true;
      selectedGate = gate;
      lastOutcome = correct ? "correct" : "incorrect";
      accountant.recordAttempt({ correct });
      if (!correct) {
        flockSize = Math.max(1, flockSize - 1);
        return Object.freeze({
          accepted: true,
          correct: false,
          progressed: false,
          completed: false,
          snapshot: snapshot(),
        });
      }

      accountant.addScore(100);
      flockSize = Math.min(7, flockSize + 1);
      pendingTargetIndex = (targetIndex + 1) % items.length;
      return Object.freeze({
        accepted: true,
        correct: true,
        progressed: true,
        completed: false,
        snapshot: snapshot(),
      });
    },
    advance(deltaMs: number): void {
      if (destroyed || phase === "complete" || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
      let remainingMs = deltaMs;
      if (phase === "gate") {
        const flightStep = Math.min(remainingMs, durationMs - flightElapsedMs);
        flightElapsedMs += flightStep;
        encounterElapsedMs += flightStep;
        remainingMs -= flightStep;
        while (encounterElapsedMs >= gateTravelMs && flightElapsedMs < durationMs) {
          encounterElapsedMs -= gateTravelMs;
          encounterIndex += 1;
          if (pendingTargetIndex !== null) targetIndex = pendingTargetIndex;
          pendingTargetIndex = null;
          selectionLocked = false;
          selectedGate = null;
          lastOutcome = null;
        }
        if (flightElapsedMs >= durationMs) {
          phase = "guardian";
          encounterElapsedMs = gateTravelMs;
          selectionLocked = true;
          selectedGate = null;
          lastOutcome = null;
        }
      }
      if (phase === "guardian" && remainingMs > 0) {
        const guardianStep = Math.min(remainingMs, guardianDurationMs - guardianElapsedMs);
        guardianElapsedMs += guardianStep;
        const reachedRound = Math.min(4, Math.floor(guardianElapsedMs / (guardianDurationMs / 4)));
        while (guardianRound < reachedRound) {
          guardianRound += 1;
          guardianHealth = Math.max(0, guardianHealth - flockSize);
          if (guardianHealth > 0) flockSize = Math.max(0, flockSize - 1);
        }
      }
      if (phase === "guardian" && guardianElapsedMs >= guardianDurationMs) finish(guardianHealth === 0 ? "victory" : "defeat");
    },
    capture: snapshot,
    restore,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

/** Maps a local pointer coordinate to one of the two gate hit regions. */
export function chooseGateFromPointer(pointerX: number, sceneWidth: number): DragonFlightGate {
  return pointerX < sceneWidth / 2 ? "left" : "right";
}

/**
 * Returns whether the edition includes generated top-down dragon flight art.
 * @param edition Audience edition supplied by the host.
 * @returns True when a dragon idle sprite is present.
 */
function usesFlightArt(edition: RuntimeEdition): boolean {
  return Boolean(edition.pack.files["dragon-flight-idle"] || edition.pack.files["dragon-rider-idle"]);
}

/**
 * Returns the physical file for a bound key, or undefined when the key is unbound.
 * @param edition Audience edition.
 * @param key Semantic binding key.
 * @returns Physical file metadata.
 */
function fileForBinding(
  edition: RuntimeEdition,
  key: string,
): { readonly width: number; readonly height: number; readonly grid?: { readonly frameWidth: number; readonly frameHeight: number } } | undefined {
  const binding = edition.bindings[key];
  if (!binding) return undefined;
  const file = (edition.pack.files as Readonly<Record<string, {
    readonly width: number;
    readonly height: number;
    readonly grid?: { readonly frameWidth: number; readonly frameHeight: number };
  }>>)[binding.file];
  return file;
}

/**
 * Destroys the tiled ground sprite.
 * @param resources Live scene resources.
 * @returns Nothing.
 */
function destroyGround(resources: SceneResources): void {
  resources.ground?.destroy();
  resources.ground = undefined;
  resources.groundWidth = 0;
  resources.groundHeight = 0;
}

/**
 * Ensures a contiguous tiled ground plane is present for the current canvas size.
 * @param scene Active Phaser scene.
 * @param resources Live scene resources.
 * @param edition Audience edition.
 * @param width Current scene width.
 * @param height Current scene height.
 * @returns Nothing.
 */
function ensureGround(
  scene: PhaserSceneLike,
  resources: SceneResources,
  edition: RuntimeEdition,
  width: number,
  height: number,
): void {
  if (resources.groundWidth === width && resources.groundHeight === height && resources.ground) return;
  destroyGround(resources);
  resources.groundWidth = width;
  resources.groundHeight = height;
  const binding = edition.bindings["world:ground"];
  if (!binding) return;
  const resolved = resolveAssetBinding(edition, "world:ground");
  if (scene.add?.tileSprite) {
    const tiled = scene.add.tileSprite(0, 0, width, height, resolved.textureKey);
    tiled.setOrigin?.(0, 0);
    tiled.setDepth?.(-35);
    resources.ground = tiled;
  } else {
    const file = fileForBinding(edition, "world:ground");
    const displayW = width;
    const displayH = file ? displayW * (file.height / file.width) : height;
    const image = scene.add?.image?.(width / 2, height / 2, resolved.textureKey);
    image?.setOrigin?.(0.5, 0.5);
    // Preserve source aspect: scale width to canvas, height proportionally; no anisotropic stretch.
    if (file) image?.setDisplaySize?.(displayW, displayH);
    image?.setDepth?.(-35);
    if (image) resources.ground = image;
  }
}

function createScene(context: DragonFlightSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let animationMs = 0;
  let _composition = context.composition;
  let previousKeys = new Set<string>();
  let activePromptFitKey = "";
  const promptFitCache = new Map<string, string>();
  const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const flightArt = usesFlightArt(context.edition);
  let parallax: FlightParallaxLayers = { sprites: [], scrollY: 0 };
  let activeAudioEncounter = "";
  let audioBounds = { left: { x: 0, y: 0, width: 0, height: 0 }, right: { x: 0, y: 0, width: 0, height: 0 } };
  const normalize = createInputActionNormalizer({
    keyboard: DRAGON_FLIGHT_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2000;
  });

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? DRAGON_FLIGHT_CANVAS.width,
    height: scene.scale?.height ?? DRAGON_FLIGHT_CANVAS.height,
  });

  const pointerXInScene = (scene: PhaserSceneLike, clientX: number, width: number): number => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0) return clientX;
    return (clientX - rect.left) * (width / rect.width);
  };

  const pointerYInScene = (scene: PhaserSceneLike, clientY: number, height: number): number => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || !rect.height || rect.height <= 0) return clientY;
    return (clientY - (rect.top ?? 0)) * (height / rect.height);
  };

  const itemPositionForGate = (state: DragonFlightSnapshot, gate: DragonFlightGate): number => gate === "left"
    ? state.gates.leftItemPosition
    : state.gates.rightItemPosition;

  const syncAudioQuestion = (state: DragonFlightSnapshot): void => {
    const encounterKey = `${state.targetIndex}:${state.encounterIndex}`;
    if (!context.answerAudio || state.phase !== "gate" || activeAudioEncounter === encounterKey) return;
    context.answerAudio.setQuestion(state.targetIndex, [state.gates.leftItemPosition, state.gates.rightItemPosition]);
    activeAudioEncounter = encounterKey;
  };

  const playGateAudio = (gate: DragonFlightGate): void => {
    const state = context.controller.snapshot();
    if (!context.answerAudio || state.phase !== "gate" || state.selectionLocked) return;
    const itemPosition = itemPositionForGate(state, gate);
    const choice = context.answerAudio.getChoiceSnapshot(state.targetIndex, itemPosition);
    if (choice.status === "loading" || choice.status === "ready" || choice.status === "playing") return;
    void context.answerAudio.playChoice(state.targetIndex, itemPosition).catch(() => undefined);
  };

  const resolveSelectedGate = (deltaMs: number): void => {
    const before = context.controller.snapshot();
    if (before.phase !== "gate" || before.selectionLocked || !before.selectedGate
      || before.gateProgress * DRAGON_FLIGHT_GATE_TRAVEL_MS + deltaMs < DRAGON_FLIGHT_GATE_TRAVEL_MS) return;
    const gate = before.selectedGate;
    const itemPosition = itemPositionForGate(before, gate);
    if (context.answerAudio && !context.answerAudio.canConfirmChoice(before.targetIndex, itemPosition)) return;
    if (context.answerAudio) {
      const confirmation = context.answerAudio.confirmChoice(before.targetIndex, itemPosition);
      if (confirmation.completedQuestion !== before.gates.correctChoices.includes(gate)) {
        throw new Error("Dragon answer audio confirmation does not match the selected gate");
      }
    }
    context.controller.choose(gate);
  };

  const setCompleteWrappedText = (text: PhaserTextLike, value: string, maxWidth: number, fontSize: number): void => {
    const fitKey = `${fontSize}\u0000${maxWidth}\u0000${value}`;
    if (fitKey === activePromptFitKey) return;
    text.setFontSize?.(fontSize).setWordWrapWidth?.(maxWidth, true);
    const cached = promptFitCache.get(fitKey);
    if (cached !== undefined) {
      text.setText(cached);
      activePromptFitKey = fitKey;
      return;
    }
    text.setText(value);
    if (!text.width || text.width <= maxWidth) {
      promptFitCache.set(fitKey, value);
      activePromptFitKey = fitKey;
      return;
    }
    const graphemes = Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment);
    const lines: string[] = [];
    let line = "";
    for (const grapheme of graphemes) {
      text.setText(line + grapheme);
      if (line && (text.width ?? 0) > maxWidth) {
        lines.push(line);
        line = grapheme;
      } else {
        line += grapheme;
      }
    }
    if (line) lines.push(line);
    const fitted = lines.join("\n");
    promptFitCache.set(fitKey, fitted);
    activePromptFitKey = fitKey;
    text.setText(fitted);
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const centerX = width / 2;
    const renderedWidth = scene.game?.canvas?.getBoundingClientRect?.().width ?? width;
    const renderedScale = renderedWidth > 0 ? Math.min(1, renderedWidth / width) : 1;
    const compactDisplay = renderedScale < 0.75 || width < 600 || _composition?.profile === "compact";
    const promptFontSize = width < 600 && renderedScale >= 0.75 ? 22 : Math.max(44, Math.ceil(18 / renderedScale));
    const gateFontSize = Math.max(19, Math.ceil(16 / renderedScale));
    const baseHudHeight = Math.min(150, height * 0.3);
    const gap = compactDisplay && width < 600 ? 8 : Math.min(48, width * 0.05);
    const sideMargins = compactDisplay && width < 600 ? 24 : 36;
    const gateWidth = compactDisplay ? (width - gap - sideMargins) / 2 : Math.min(330, width * 0.36);
    const leftX = centerX - gateWidth - gap / 2;
    const rightX = centerX + gap / 2;
    const gateHeight = Math.min(126, height * 0.23);
    const plaqueWidth = compactDisplay ? gateWidth - 12 : Math.min(gateWidth - 18, 250);
    const gateWrapWidth = plaqueWidth - 24;
    const pulse = Math.sin(animationMs / 1000 * Math.PI * 2) * 4;

    const promptValue = state.phase === "gate" ? state.prompt : state.phase === "guardian" ? `BAT ♥ ${state.guardianHealth}` : state.outcome?.toUpperCase() ?? "";
    const promptWrapWidth = width - (width < 600 ? 48 : 64);
    setCompleteWrappedText(resources.prompt, promptValue, promptWrapWidth, promptFontSize);
    resources.prompt.setPosition(centerX, 52);
    const progressY = Math.max(96, 52 + (resources.prompt.height ?? promptFontSize) / 2 + 14);
    const hudHeight = Math.max(baseHudHeight, progressY + 30);
    const gateY = hudHeight + state.gateProgress * Math.max(1, height - hudHeight - gateHeight - 52);
    audioBounds = {
      left: { x: leftX + gateWidth / 2 - 30, y: gateY + 8, width: 60, height: 40 },
      right: { x: rightX + gateWidth / 2 - 30, y: gateY + 8, width: 60, height: 40 },
    };
    const laneX = state.selectedGate === "left" ? width * 0.28 : state.selectedGate === "right" ? width * 0.72 : centerX;
    resources.leftGate.setFontSize?.(gateFontSize).setWordWrapWidth?.(gateWrapWidth).setText(state.phase === "gate" ? context.answerAudio ? "1" : state.gates.left : "").setPosition(leftX + gateWidth / 2, gateY + gateHeight / 2);
    resources.rightGate.setFontSize?.(gateFontSize).setWordWrapWidth?.(gateWrapWidth).setText(state.phase === "gate" ? context.answerAudio ? "2" : state.gates.right : "").setPosition(rightX + gateWidth / 2, gateY + gateHeight / 2);
    for (const [gate, control] of [["left", resources.leftAudio], ["right", resources.rightAudio]] as const) {
      const bounds = audioBounds[gate];
      const choice = context.answerAudio?.getChoiceSnapshot(state.targetIndex, itemPositionForGate(state, gate));
      const active = choice?.status === "loading" || choice?.status === "ready" || choice?.status === "playing";
      control.setText(context.answerAudio && state.phase === "gate" ? `${gate === "left" ? 1 : 2} ${choice?.status === "failed" ? "↻" : active ? "…" : "🔊"}` : "")
        .setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    }

    resources.graphics.clear();
    resources.overlay.clear();
    if (flightArt) {
      // Contiguous tiled ground with no full-screen tint overlay hiding it.
      ensureGround(scene, resources, context.edition, width, height);
      if (parallax.sprites.length === 0) {
        parallax = createFlightParallax(scene, context.edition, width, height);
        parallax.sprites[2]?.setDepth?.(-34).setAlpha?.(1);
        parallax.sprites[0]?.setDepth?.(-36).setAlpha?.(0);
        parallax.sprites[1]?.setDepth?.(-18).setAlpha?.(0.3).setTileScale?.(4, 4);
      }
      if (parallax.sprites.length === 0) {
        resources.graphics.fillStyle(0x6eb6e8, 1).fillRect(0, 0, width, height);
      }
      const gateBindingKey = "prop:gate";
      const dragonBindingKey = "player:idle";
      const gateResolved = context.edition.bindings[gateBindingKey]
        ? resolveAssetBinding(context.edition, gateBindingKey)
        : undefined;
      const dragonResolved = context.edition.bindings[dragonBindingKey]
        ? resolveAssetBinding(context.edition, dragonBindingKey)
        : undefined;
      const guardianResolved = context.edition.bindings["enemy:idle"]
        ? resolveAssetBinding(context.edition, "enemy:idle")
        : undefined;
      const place = (
        current: PhaserImageLike | undefined,
        x: number,
        y: number,
        bindingKey: string,
        textureKey: string,
        targetWidth: number,
      ): PhaserImageLike | undefined => {
        const file = fileForBinding(context.edition, bindingKey);
        // Preserve source aspect: height scales proportionally from targetWidth; no anisotropic stretch.
        // Visible bbox for dragon-flight-idle is 96x58 within 96x96, for prop-sky-gate 84x96 within 96x96.
        // Target width is chosen by visible bbox, display size is scaled by file aspect to keep art undistorted.
        const displayW = targetWidth;
        const sourceWidth = file?.grid?.frameWidth ?? file?.width;
        const sourceHeight = file?.grid?.frameHeight ?? file?.height;
        const displayH = sourceWidth && sourceHeight ? displayW * (sourceHeight / sourceWidth) : targetWidth;
        const image = current
          ?? scene.add?.sprite?.(x, y, textureKey)
          ?? scene.add?.image?.(x, y, textureKey);
        image?.setOrigin?.(0.5, 0.5);
        image?.setPosition?.(x, y);
        image?.setDisplaySize?.(displayW, displayH);
        image?.setDepth?.(6);
        return image;
      };
      if (gateResolved && state.phase === "gate") {
        // Gate file 96x96, visible 84x96 — 120 width preserves aspect and sizes by visible bbox.
        resources.leftGateArt = place(resources.leftGateArt, leftX + gateWidth / 2, gateY + gateHeight / 2, gateBindingKey, gateResolved.textureKey, 120);
        resources.rightGateArt = place(resources.rightGateArt, rightX + gateWidth / 2, gateY + gateHeight / 2, gateBindingKey, gateResolved.textureKey, 120);
      }
      resources.leftGateArt?.setAlpha?.(state.phase === "gate" ? 1 : 0);
      resources.rightGateArt?.setAlpha?.(state.phase === "gate" ? 1 : 0);
      if (dragonResolved) {
        while (resources.dragons.length < state.flockSize) {
          const dragon = place(undefined, centerX, height * 0.82, dragonBindingKey, dragonResolved.textureKey, 96);
          if (!dragon) break;
          resources.dragons.push(dragon);
        }
        while (resources.dragons.length > state.flockSize) resources.dragons.pop()?.destroy();
        const formation = [[0, 0], [-58, 42], [58, 42], [-112, 78], [112, 78], [-168, 110], [168, 110]] as const;
        resources.dragons.forEach((dragon, index) => {
          const [offsetX, offsetY] = formation[index] ?? [0, index * 24];
          dragon.setPosition?.(laneX + offsetX, height * 0.76 + offsetY + pulse);
          dragon.setAlpha?.(state.phase === "complete" ? 0.55 : 1);
        });
      }
      if (guardianResolved && state.phase !== "gate") {
        resources.guardian = place(resources.guardian, centerX, height * (0.18 + state.guardianProgress * 0.2), "enemy:idle", guardianResolved.textureKey, 190);
        resources.guardian?.setFrame?.(Math.floor(animationMs / 120) % 6);
        resources.guardian?.setAlpha?.(state.phase === "complete" ? 0.35 : 1);
      }
    } else {
      resources.graphics.fillStyle(0x08152b, 1).fillRect(0, 0, width, height);
      resources.graphics.fillStyle(0x122b4d, 1).fillCircle(width * 0.12, height * 0.18, 46);
      resources.graphics.fillStyle(0x1b3b63, 1).fillCircle(width * 0.84, height * 0.22, 62);
      resources.graphics.fillStyle(0x234f70, 1).fillTriangle(0, height, width * 0.28, height * 0.55, width * 0.55, height);
      resources.graphics.fillStyle(0x173a5d, 1).fillTriangle(width * 0.4, height, width * 0.7, height * 0.48, width, height);
      resources.graphics.fillStyle(0x63d8ff, 1).fillCircle(centerX, height * 0.34 + pulse, 34);
      resources.graphics.fillStyle(0x8ef0ff, 1).fillTriangle(centerX - 20, height * 0.32 + pulse, centerX - 100, height * 0.2 + pulse, centerX - 72, height * 0.4 + pulse);
      resources.graphics.fillStyle(0x8ef0ff, 1).fillTriangle(centerX + 20, height * 0.32 + pulse, centerX + 100, height * 0.2 + pulse, centerX + 72, height * 0.4 + pulse);
      resources.graphics.fillStyle(0x101a2c, 1).fillCircle(centerX + 12, height * 0.33 + pulse, 5);
      resources.graphics.fillStyle(0xffd166, 1).fillTriangle(centerX + 26, height * 0.36 + pulse, centerX + 48, height * 0.37 + pulse, centerX + 26, height * 0.4 + pulse);
      resources.graphics.fillStyle(0xff8c42, 0.9).fillTriangle(centerX - 38, height * 0.44 + pulse, centerX - 58, height * 0.5 + pulse, centerX - 25, height * 0.48 + pulse);
      if (state.phase === "gate") {
        resources.graphics.fillStyle(0x255f86, 1).fillRoundedRect(leftX, gateY, gateWidth, gateHeight, 18);
        resources.graphics.fillStyle(0x255f86, 1).fillRoundedRect(rightX, gateY, gateWidth, gateHeight, 18);
        resources.graphics.lineStyle(4, 0x8ef0ff, 0.9).strokeRoundedRect(leftX, gateY, gateWidth, gateHeight, 18);
        resources.graphics.lineStyle(4, 0xffd166, 0.9).strokeRoundedRect(rightX, gateY, gateWidth, gateHeight, 18);
      } else {
        resources.graphics.fillStyle(0x3b173c, 1).fillCircle(centerX, height * 0.3, 70 + pulse);
      }
    }

    resources.overlay.fillStyle(0x071525, 0.86).fillRoundedRect(18, 16, width - 36, hudHeight - 28, 18);
    resources.overlay.lineStyle(2, 0x8edcff, 0.65).strokeRoundedRect(18, 16, width - 36, hudHeight - 28, 18);
    if (state.phase === "gate") {
      const wrappedTextHeight = Math.max(resources.leftGate.height ?? 0, resources.rightGate.height ?? 0);
      const plaqueHeight = compactDisplay ? Math.max(gateHeight, Math.ceil(wrappedTextHeight + 16)) : 48;
      const gateCenterY = gateY + gateHeight / 2;
      const plaqueCenterY = compactDisplay
        ? Math.min(height - plaqueHeight / 2, Math.max(hudHeight + plaqueHeight / 2, gateCenterY))
        : gateCenterY;
      const plaqueY = plaqueCenterY - plaqueHeight / 2;
      resources.leftGate.setPosition(leftX + gateWidth / 2, plaqueCenterY);
      resources.rightGate.setPosition(rightX + gateWidth / 2, plaqueCenterY);
      resources.overlay.fillStyle(0x071525, 0.94).fillRoundedRect(leftX + (gateWidth - plaqueWidth) / 2, plaqueY, plaqueWidth, plaqueHeight, 12);
      resources.overlay.fillStyle(0x071525, 0.94).fillRoundedRect(rightX + (gateWidth - plaqueWidth) / 2, plaqueY, plaqueWidth, plaqueHeight, 12);
      resources.overlay.lineStyle(2, 0xf4d35e, 0.9).strokeRoundedRect(leftX + (gateWidth - plaqueWidth) / 2, plaqueY, plaqueWidth, plaqueHeight, 12);
      resources.overlay.lineStyle(2, 0xf4d35e, 0.9).strokeRoundedRect(rightX + (gateWidth - plaqueWidth) / 2, plaqueY, plaqueWidth, plaqueHeight, 12);
      if (context.answerAudio) {
        for (const gate of ["left", "right"] as const) {
          const bounds = audioBounds[gate];
          const choice = context.answerAudio.getChoiceSnapshot(state.targetIndex, itemPositionForGate(state, gate));
          resources.overlay.fillStyle(0x071525, 0.98).fillRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 10);
          resources.overlay.lineStyle(3, choice.status === "failed" ? 0xf87171 : 0x8edcff, 1)
            .strokeRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 10);
        }
      }
    }

    resources.title.setText("");
    resources.progress.setText(state.phase === "gate"
      ? `${Math.ceil(state.timeRemainingMs / 1000)}s  •  🐉 ${state.flockSize}`
      : `🐉 ${state.flockSize}  •  ♥ ${state.guardianHealth}/${DRAGON_FLIGHT_GUARDIAN_HEALTH}`).setPosition(32, progressY);
    resources.feedback
      .setText(state.phase === "complete" ? state.outcome?.toUpperCase() ?? "" : state.phase === "guardian" ? "" : state.lastOutcome?.toUpperCase() ?? "")
      .setPosition(32, height - 70);
    resources.instructions.setText("").setPosition(32, height - 38);
  };

  const cleanup = (): void => {
    frameScheduler.cancel();
    if (!resources) return;
    context.controller.destroy();
    destroyFlightParallax(parallax);
    destroyGround(resources);
    for (const dragon of resources.dragons) dragon.destroy();
    resources.guardian?.destroy();
    resources.leftGateArt?.destroy();
    resources.rightGateArt?.destroy();
    resources.graphics.destroy();
    resources.overlay.destroy();
    resources.title.destroy();
    resources.prompt.destroy();
    resources.progress.destroy();
    resources.leftGate.destroy();
    resources.rightGate.destroy();
    resources.feedback.destroy();
    resources.instructions.destroy();
    resources.leftAudio.destroy();
    resources.rightAudio.destroy();
    context.answerAudio?.cancel();
    resources = undefined;
    previousKeys = new Set<string>();
    activePromptFitKey = "";
    promptFitCache.clear();
  };

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load || !flightArt) return;
    preloadFlightParallax(this, context.edition);
    const keys = ["world:ground", "player:idle", "prop:gate", "enemy:idle"].filter((key) => Boolean(context.edition.bindings[key]));
    if (keys.length) preloadAssetBindings(this.load, context.edition, keys);
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Dragon Flight requires Phaser display services");
    const textStyle = { fontFamily: "Arial", color: "#f6fbff", fontSize: "24px", align: "center" };
    resources = {
      graphics: this.add.graphics(),
      overlay: this.add.graphics(),
      title: this.add.text(32, 22, "", { ...textStyle, fontSize: "30px", fontStyle: "bold" }),
      prompt: this.add.text(32, 66, "", { ...textStyle, fontSize: "44px", fontStyle: "bold" }),
      progress: this.add.text(32, 112, "", { ...textStyle, fontSize: "16px", color: "#9ddcff" }),
      leftGate: this.add.text(0, 0, "", { ...textStyle, fontSize: "19px", wordWrap: { width: 280 } }),
      rightGate: this.add.text(0, 0, "", { ...textStyle, fontSize: "19px", wordWrap: { width: 280 } }),
      leftAudio: this.add.text(0, 0, "", { ...textStyle, fontSize: "18px" }),
      rightAudio: this.add.text(0, 0, "", { ...textStyle, fontSize: "18px" }),
      feedback: this.add.text(0, 0, "", { ...textStyle, fontSize: "18px", color: "#ffd166" }),
      instructions: this.add.text(0, 0, "", { ...textStyle, fontSize: "16px", color: "#b4c7e7" }),
      dragons: [],
      groundWidth: 0,
      groundHeight: 0,
    };
    resources.prompt.setOrigin?.(0.5, 0.5);
    resources.leftGate.setOrigin?.(0.5, 0.5);
    resources.rightGate.setOrigin?.(0.5, 0.5);
    resources.leftAudio.setOrigin?.(0.5, 0.5);
    resources.rightAudio.setOrigin?.(0.5, 0.5);
    resources.overlay.setDepth?.(20);
    resources.prompt.setDepth?.(21);
    resources.progress.setDepth?.(21);
    resources.leftGate.setDepth?.(21);
    resources.rightGate.setDepth?.(21);
    resources.leftAudio.setDepth?.(22);
    resources.rightAudio.setDepth?.(22);
    resources.feedback.setDepth?.(21);
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    syncAudioQuestion(context.controller.snapshot());
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time: number, delta: number): void {
    frameScheduler.tick(delta);
    tickFlightParallax(parallax, delta);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action === "move-left") context.controller.steer("left");
        if (action === "move-right") context.controller.steer("right");
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const action = normalize({ modality: "pointer", phase: "up", x: input.pointer.x, y: input.pointer.y })[0]?.action;
        if (action === "confirm") {
          const { width, height } = dimensions(this);
          const localX = pointerXInScene(this, input.pointer.x, width);
          const localY = pointerYInScene(this, input.pointer.y, height);
          const audioGate = (["left", "right"] as const).find((gate) => {
            const bounds = audioBounds[gate];
            return localX >= bounds.x && localX <= bounds.x + bounds.width && localY >= bounds.y && localY <= bounds.y + bounds.height;
          });
          if (audioGate && context.answerAudio) playGateAudio(audioGate);
          else context.controller.steer(chooseGateFromPointer(localX, width));
        }
      }
      resolveSelectedGate(delta);
      context.controller.advance(delta);
      syncAudioQuestion(context.controller.snapshot());
    }
    updateView(this);
  };

  return {
    key: context.id,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Dragon Flight responsive state is invalid");
        context.controller.restore(state as DragonFlightSnapshot);
      },
      apkRecompose: (nextComposition: DragonFlightSceneContext["composition"]) => {
        _composition = nextComposition;
      },
    },
  };
}

interface DragonFlightCartridgeIdentity {
  readonly id: typeof DRAGON_FLIGHT_ID | typeof DRAGON_RIDER_ID;
  readonly title: string;
  readonly description: string;
  readonly requiredAssetBindings: readonly string[];
}

function createFlightCartridge(identity: DragonFlightCartridgeIdentity): StandardExperienceCartridge {
  let activeController: DragonFlightController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: identity.id,
    title: identity.title,
    description: identity.description,
    inputMode: "vocabulary",
    objective: "Build the dragon flock before the guardian reaches the flight.",
    mechanicInstruction: "Read the Thai prompt and choose its English gate.",
    keyboardKeys: ["A", "Left Arrow", "D", "Right Arrow"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      if (controller.snapshot().selectionLocked) controller.advance(DRAGON_FLIGHT_GATE_TRAVEL_MS);
      const correctChoice = controller.snapshot().gates.correctChoice;
      controller.choose(
        actionId === "action:select-correct"
          ? correctChoice
          : correctChoice === "left" ? "right" : "left",
      );
    },
  });
  return {
    manifest: {
      id: identity.id,
      title: identity.title,
      description: identity.description,
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: [...identity.requiredAssetBindings],
      capabilities: [
        ...(identity.id === DRAGON_FLIGHT_ID ? ["capability:bounded-frame-delta"] : []),
        "capability:input-action-normalization",
        "capability:language-target-progression",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:time-and-frame-loop",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const outcomeReader: { current?: () => "victory" | "defeat" | null } = {};
      const controller = createDragonFlightController(
        input,
        sessionMode === "playing"
          ? (result) => context.complete(result, outcomeReader.current?.() ?? "defeat")
          : () => undefined,
        { seed: context.seed },
      );
      outcomeReader.current = () => controller.snapshot().outcome;
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: identity.id === DRAGON_FLIGHT_ID ? "DRAGON_FLIGHT_READY" : "DRAGON_RIDER_READY",
        message: `${identity.title} gate choices are ready`,
        details: { cartridgeId: identity.id, editionId: context.edition.id, targetCount: input.length },
      });
      return {
        width: DRAGON_FLIGHT_CANVAS.width,
        height: DRAGON_FLIGHT_CANVAS.height,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
          id: identity.id,
          title: identity.title,
          controller,
          inputController: context.inputController,
          composition: context.composition,
          totalTargets: input.length,
          sessionMode,
          edition: context.edition,
          answerAudio: context.answerAudio,
        }),
      };
    },
  };
}

/**
 * Creates a runtime-compatible Dragon Flight cartridge.
 * @returns A timed vocabulary flight with the Dragon Flight identity.
 */
export function createDragonFlightCartridge(): StandardExperienceCartridge {
  return createFlightCartridge({
    id: DRAGON_FLIGHT_ID,
    title: "Dragon Flight",
    description: "Choose English gates, grow the dragon flock, and face the guardian.",
    requiredAssetBindings: [],
  });
}

/**
 * Creates a runtime-compatible Dragon Rider cartridge on the shared flight engine.
 * @returns A timed vocabulary flight with the historical Dragon Rider identity.
 */
export function createDragonRiderCartridge(): StandardExperienceCartridge {
  return createFlightCartridge({
    id: DRAGON_RIDER_ID,
    title: "Dragon Rider",
    description: "Choose English gates, grow the dragon flock, and face the guardian.",
    requiredAssetBindings: ["dragon-rider/player-flight"],
  });
}
