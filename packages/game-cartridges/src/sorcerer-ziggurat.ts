import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
  type APKInputController,
  type CartridgeGameConfigContext,
  type CompletionDelivery,
  type InputActionId,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for The Sorcerer's Ziggurat cartridge. */
export const SORCERER_ZIGGURAT_ID = "sorcerer-ziggurat" as const;

/** Phaser canvas size used by The Sorcerer's Ziggurat before host scaling. */
export const SORCERER_ZIGGURAT_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Keyboard bindings accepted by the rune-cube traversal. */
export const SORCERER_ZIGGURAT_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowRight: "move-right",
  KeyD: "move-right",
});

/** One adjacent direction on the rune-cube path. */
export type ZigguratDirection = "left" | "forward" | "right";

/** Labels and correct path direction for one ziggurat level. */
export interface ZigguratRuneOptions {
  /** Label on the left cube. */
  readonly left: string;
  /** Label on the forward cube. */
  readonly forward: string;
  /** Label on the right cube. */
  readonly right: string;
  /** Direction that contains the next required sentence word. */
  readonly correctDirection: ZigguratDirection;
}

/** Active or terminal phase in The Sorcerer's Ziggurat session. */
export type SorcererZigguratPhase = "climb" | "complete";

/** Immutable state exposed by the transport-independent ziggurat rules. */
export interface SorcererZigguratSnapshot {
  /** Current game phase. */
  readonly phase: SorcererZigguratPhase;
  /** Active sentence ritual index, or the ritual count after completion. */
  readonly sentenceIndex: number;
  /** Index of the next required word in the active ritual. */
  readonly wordIndex: number;
  /** Translation shown as the player prompt. */
  readonly prompt: string;
  /** Source sentence assembled by the current ritual. */
  readonly sentence: string;
  /** Three reachable rune cubes for the next step. */
  readonly runes: ZigguratRuneOptions;
  /** Result of the most recent valid cube selection. */
  readonly lastOutcome?: "correct" | "incorrect";
  /** Number of correct adjacent steps. */
  readonly correctAnswers: number;
  /** Number of legal cube selections. */
  readonly totalAttempts: number;
  /** Current game score. */
  readonly score: number;
  /** Whether the scene lifecycle has destroyed this session. */
  readonly destroyed: boolean;
}

/** Result returned after one adjacent rune-cube selection. */
export interface SorcererZigguratStepResult {
  /** Whether the direction was accepted for the active session. */
  readonly accepted: boolean;
  /** Whether the selected rune was correct. */
  readonly correct: boolean;
  /** Whether the ordered ritual advanced. */
  readonly progressed: boolean;
  /** Whether this step completed the active ritual. */
  readonly ritualCompleted: boolean;
  /** Whether this step completed every ritual. */
  readonly completed: boolean;
  /** Terminal result on the first completing step. */
  readonly result?: GameResults;
  /** State after applying the step. */
  readonly snapshot: SorcererZigguratSnapshot;
}

/** Transport-independent ziggurat rules and lifecycle controls. */
export interface SorcererZigguratController {
  /** Returns the current immutable game state. */
  snapshot(): SorcererZigguratSnapshot;
  /** Selects one adjacent rune cube. */
  step(direction: ZigguratDirection): SorcererZigguratStepResult;
  /** Captures state for a responsive Phaser reflow. */
  capture(): SorcererZigguratSnapshot;
  /** Restores state captured before a responsive Phaser reflow. */
  restore(snapshot: SorcererZigguratSnapshot): void;
  /** Seals the session so a destroyed scene cannot emit a later result. */
  destroy(): void;
}

/** Minimal Phaser graphics surface used by the procedural ziggurat. */
interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}

/** Minimal Phaser text surface used by the procedural ziggurat. */
interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

/** Minimal Phaser canvas surface needed for pointer conversion. */
interface PhaserCanvasLike {
  getBoundingClientRect?(): { readonly left: number; readonly width: number };
}

/** Minimal Phaser scene surface used by this cartridge. */
interface PhaserSceneLike {
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
  };
  events?: {
    once(event: string, listener: () => void): void;
  };
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

/** Resources owned by one active ziggurat scene. */
interface SceneResources {
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly leftRune: PhaserTextLike;
  readonly forwardRune: PhaserTextLike;
  readonly rightRune: PhaserTextLike;
}

/** Current Phaser scene options passed to the ziggurat renderer. */
interface SorcererZigguratSceneContext {
  readonly controller: SorcererZigguratController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly totalSentences: number;
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: CartridgeGameConfigContext["sessionMode"];
}

const ZIGGURAT_DIRECTIONS: readonly ZigguratDirection[] = Object.freeze(["left", "forward", "right"]);

function tokenizeSentence(sentence: string): readonly string[] {
  return Object.freeze(sentence.trim().split(/\s+/u).filter(Boolean));
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error("Sorcerer's Ziggurat seed must be finite");
  return Math.abs(Math.trunc(seed));
}

function directionFor(seed: number, sentenceIndex: number, wordIndex: number): ZigguratDirection {
  return ZIGGURAT_DIRECTIONS[(seed + sentenceIndex * 7 + wordIndex * 11) % ZIGGURAT_DIRECTIONS.length]!;
}

function calculateProgressCount(
  sentenceWords: readonly (readonly string[])[],
  snapshot: SorcererZigguratSnapshot,
): number {
  if (snapshot.phase === "complete") {
    return sentenceWords.reduce((total, words) => total + words.length, 0);
  }
  return sentenceWords
    .slice(0, snapshot.sentenceIndex)
    .reduce((total, words) => total + words.length, 0) + snapshot.wordIndex;
}

function runeOptions(
  allWords: readonly string[],
  wordIndex: number,
  correctDirection: ZigguratDirection,
): ZigguratRuneOptions {
  const expected = allWords[Math.min(wordIndex, allWords.length - 1)]!;
  const labels: Record<ZigguratDirection, string> = {
    left: expected,
    forward: expected,
    right: expected,
  };
  const decoyDirections = ZIGGURAT_DIRECTIONS.filter((direction) => direction !== correctDirection);
  decoyDirections.forEach((direction, decoyIndex) => {
    labels[direction] = allWords[(wordIndex + decoyIndex + 1) % allWords.length]!;
  });
  labels[correctDirection] = expected;
  return Object.freeze({ ...labels, correctDirection });
}

/**
 * Creates reusable ziggurat rules for one sentence array.
 * @param input Untrusted sentence input from a host or test.
 * @param deliver Completion callback that receives one terminal result.
 * @param seed Deterministic seed for the correct cube direction sequence.
 * @returns A controller for ordered rune-cube traversal.
 * @throws When the sentence input is invalid, empty, blank, or the seed is invalid.
 */
export function createSorcererZigguratController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
  seed = 0,
): SorcererZigguratController {
  const parsedInput = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "sentence");
  const normalizedSeed = normalizeSeed(seed);
  const sentenceWords = content.items.map((item) => tokenizeSentence(item.term));
  const allWords = Object.freeze(sentenceWords.flatMap((words) => [...words]));
  const stepIds = sentenceWords.map((words, sentenceIndex) =>
    words.map((_word, wordIndex) => `step:${sentenceIndex}:${wordIndex}`),
  );
  const allStepIds = stepIds.flat();
  const progression = createLanguageTargetProgression(allStepIds);
  let accountant = createResultAccountant();
  const completion = createCompletionLatch(deliver);
  let phase: SorcererZigguratPhase = "climb";
  let sentenceIndex = 0;
  let wordIndex = 0;
  let lastOutcome: "correct" | "incorrect" | undefined;
  let destroyed = false;

  const snapshot = (): SorcererZigguratSnapshot => {
    const displayIndex = Math.min(sentenceIndex, content.items.length - 1);
    const displayWordIndex = phase === "complete"
      ? Math.max(0, sentenceWords[displayIndex]!.length - 1)
      : wordIndex;
    const correctDirection = directionFor(normalizedSeed, displayIndex, displayWordIndex);
    return Object.freeze({
      phase,
      sentenceIndex,
      wordIndex,
      prompt: content.items[displayIndex]!.translation,
      sentence: content.items[displayIndex]!.term,
      runes: runeOptions(
        allWords,
        sentenceWords
          .slice(0, displayIndex)
          .reduce((total, words) => total + words.length, 0) + displayWordIndex,
        correctDirection,
      ),
      ...(lastOutcome === undefined ? {} : { lastOutcome }),
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      destroyed,
    });
  };

  const restore = (state: SorcererZigguratSnapshot): void => {
    if (destroyed) return;
    const validActiveState = state.phase === "climb"
      && state.sentenceIndex >= 0
      && state.sentenceIndex < sentenceWords.length
      && state.wordIndex >= 0
      && state.wordIndex < sentenceWords[state.sentenceIndex]!.length;
    const validCompleteState = state.phase === "complete"
      && state.sentenceIndex === sentenceWords.length
      && state.wordIndex === 0;
    if (!validActiveState && !validCompleteState) {
      throw new Error("Sorcerer's Ziggurat responsive state has invalid ritual progress");
    }
    const progressCount = calculateProgressCount(sentenceWords, state);
    if (
      state.correctAnswers !== progressCount
      || state.totalAttempts < progressCount
      || state.score !== progressCount * 100
    ) {
      throw new Error("Sorcerer's Ziggurat responsive state has invalid result counters");
    }
    progression.reset();
    for (const id of allStepIds.slice(0, progressCount)) progression.match(id);
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
    phase = state.phase;
    sentenceIndex = state.sentenceIndex;
    wordIndex = state.wordIndex;
    lastOutcome = state.lastOutcome;
    destroyed = state.destroyed;
    if (destroyed) completion.sealWithoutDelivery();
  };

  return Object.freeze({
    snapshot,
    step(direction: ZigguratDirection): SorcererZigguratStepResult {
      const before = snapshot();
      if (destroyed || phase === "complete") {
        return Object.freeze({
          accepted: false,
          correct: false,
          progressed: false,
          ritualCompleted: false,
          completed: phase === "complete",
          snapshot: before,
        });
      }

      const correctDirection = before.runes.correctDirection;
      const match = progression.match(
        direction === correctDirection ? stepIds[sentenceIndex]![wordIndex]! : `wrong:${sentenceIndex}:${wordIndex}:${direction}`,
      );
      accountant.recordAttempt({ correct: match.matched });
      lastOutcome = match.matched ? "correct" : "incorrect";
      if (!match.matched) {
        return Object.freeze({
          accepted: true,
          correct: false,
          progressed: false,
          ritualCompleted: false,
          completed: false,
          snapshot: snapshot(),
        });
      }

      accountant.addScore(100);
      wordIndex += 1;
      const ritualCompleted = wordIndex >= sentenceWords[sentenceIndex]!.length;
      if (!ritualCompleted) {
        return Object.freeze({
          accepted: true,
          correct: true,
          progressed: true,
          ritualCompleted: false,
          completed: false,
          snapshot: snapshot(),
        });
      }

      sentenceIndex += 1;
      wordIndex = 0;
      if (!progression.isComplete) {
        return Object.freeze({
          accepted: true,
          correct: true,
          progressed: true,
          ritualCompleted: true,
          completed: false,
          snapshot: snapshot(),
        });
      }

      phase = "complete";
      const result = gameResultsSchema.parse(
        finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
      );
      completion.complete(result);
      return Object.freeze({
        accepted: true,
        correct: true,
        progressed: true,
        ritualCompleted: true,
        completed: true,
        result,
        snapshot: snapshot(),
      });
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

/**
 * Maps a local pointer coordinate to a ziggurat rune direction.
 * @param pointerX Scene-space pointer horizontal coordinate.
 * @param sceneWidth Current scene width.
 * @returns The left, forward, or right rune direction.
 */
export function chooseZigguratDirectionFromPointer(
  pointerX: number,
  sceneWidth: number,
): ZigguratDirection {
  if (pointerX < sceneWidth / 3) return "left";
  if (pointerX > sceneWidth * 2 / 3) return "right";
  return "forward";
}

function createScene(context: SorcererZigguratSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let animationMs = 0;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  const normalize = createInputActionNormalizer({
    keyboard: SORCERER_ZIGGURAT_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 3_000;
  });

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? SORCERER_ZIGGURAT_CANVAS.width,
    height: scene.scale?.height ?? SORCERER_ZIGGURAT_CANVAS.height,
  });

  const pointerXInScene = (scene: PhaserSceneLike, clientX: number, width: number): number => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0) return clientX;
    return (clientX - rect.left) * (width / rect.width);
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const cubeY = height * 0.69;
    const cubeWidth = Math.min(188, width * 0.23);
    const cubeHeight = Math.min(88, height * 0.17);
    const choices: readonly ZigguratDirection[] = ["left", "forward", "right"];
    const cubeX = { left: width * 0.23, forward: width * 0.5, right: width * 0.77 };
    const ritualProgress = state.phase === "complete" ? 1 : state.wordIndex / Math.max(1, state.sentence.trim().split(/\s+/u).length);
    const playerY = height * (0.62 - ritualProgress * 0.22);
    const glow = 0.65 + Math.sin(animationMs / 500) * 0.2;

    resources.graphics.clear();
    resources.graphics.fillStyle(0x120d28, 1).fillRect(0, 0, width, height);
    resources.graphics.fillStyle(0x30224c, 1).fillTriangle(0, height, width * 0.5, height * 0.12, width, height);
    resources.graphics.fillStyle(0x21183a, 1).fillTriangle(width * 0.08, height, width * 0.5, height * 0.26, width * 0.92, height);
    for (let level = 0; level < 4; level += 1) {
      const levelWidth = width * (0.7 - level * 0.11);
      const levelY = height * (0.82 - level * 0.11);
      resources.graphics.fillStyle(0x5d3f65, 1).fillRoundedRect((width - levelWidth) / 2, levelY, levelWidth, 38, 8);
      resources.graphics.lineStyle(2, 0xd6a75d, 0.7).strokeRoundedRect((width - levelWidth) / 2, levelY, levelWidth, 38, 8);
    }
    for (const direction of choices) {
      const x = cubeX[direction];
      resources.graphics.fillStyle(0x6a526f, 0.82 + glow * 0.08);
      resources.graphics.fillRoundedRect(x - cubeWidth / 2, cubeY - cubeHeight / 2, cubeWidth, cubeHeight, 14);
      resources.graphics.lineStyle(3, 0xd2bad4, 0.92).strokeRoundedRect(x - cubeWidth / 2, cubeY - cubeHeight / 2, cubeWidth, cubeHeight, 14);
      resources.graphics.fillStyle(0xb9a0c4, 0.8).fillCircle(x, cubeY - 18, 11);
    }
    resources.graphics.fillStyle(0xf5d66d, 1).fillCircle(width / 2, playerY - 14, 16);
    resources.graphics.fillStyle(0x498cbf, 1).fillTriangle(width / 2 - 22, playerY + 16, width / 2, playerY - 52, width / 2 + 22, playerY + 16);
    resources.graphics.fillStyle(0xead6ff, 0.8).fillTriangle(width / 2 - 32, playerY - 35, width / 2, playerY - 76, width / 2 + 32, playerY - 35);

    resources.title.setText("THE SORCERER'S ZIGGURAT").setPosition(28, 20);
    resources.prompt.setText(`Complete the ritual for: ${state.prompt}`).setPosition(28, 60);
    resources.progress
      .setText(
        `${composition?.profile === "compact" ? "Compact ascent" : "Rune ascent"}  •  Ritual ${Math.min(state.sentenceIndex + 1, context.totalSentences)} of ${context.totalSentences}  •  Step ${state.wordIndex + 1}`,
      )
      .setPosition(28, 96);
    resources.leftRune.setText(`←  ${state.runes.left}`).setPosition(cubeX.left - cubeWidth / 2 + 16, cubeY + 12);
    resources.forwardRune.setText(`↑  ${state.runes.forward}`).setPosition(cubeX.forward - cubeWidth / 2 + 16, cubeY + 12);
    resources.rightRune.setText(`→  ${state.runes.right}`).setPosition(cubeX.right - cubeWidth / 2 + 16, cubeY + 12);
    resources.feedback
      .setText(
        state.phase === "complete"
          ? "The ritual is complete!"
          : state.lastOutcome === "incorrect"
            ? "That rune fades. Choose another adjacent cube."
            : "Choose the rune that continues the sentence.",
      )
      .setPosition(28, height - 68);
    resources.instructions
      .setText("Keyboard: A / ←, W / ↑, D / →   •   Touch or click a rune cube")
      .setPosition(28, height - 36);
  };

  const applyStep = (direction: ZigguratDirection): void => {
    const result = context.controller.step(direction);
    if (!result.accepted) return;
    context.diagnostic({
      level: "info",
      code: result.completed ? "SORCERER_ZIGGURAT_COMPLETE" : "SORCERER_ZIGGURAT_STEP",
      message: result.completed ? "The Sorcerer's Ziggurat completed every ritual." : result.correct ? "The Sorcerer's Ziggurat accepted a rune step." : "The Sorcerer's Ziggurat rejected a rune step.",
      details: {
        correct: result.correct,
        sentenceIndex: result.snapshot.sentenceIndex,
        wordIndex: result.snapshot.wordIndex,
      },
    });
  };

  const cleanup = (): void => {
    if (!resources) return;
    frameScheduler.cancel();
    context.controller.destroy();
    resources.graphics.destroy();
    resources.title.destroy();
    resources.prompt.destroy();
    resources.progress.destroy();
    resources.feedback.destroy();
    resources.instructions.destroy();
    resources.leftRune.destroy();
    resources.forwardRune.destroy();
    resources.rightRune.destroy();
    resources = undefined;
    previousKeys = new Set<string>();
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("The Sorcerer's Ziggurat requires Phaser display services");
    const textStyle = { fontFamily: "Arial", color: "#fff8e7", fontSize: "20px" };
    resources = {
      graphics: this.add.graphics(),
      title: this.add.text(28, 20, "THE SORCERER'S ZIGGURAT", { ...textStyle, fontSize: "29px", fontStyle: "bold" }),
      prompt: this.add.text(28, 60, "", { ...textStyle, fontSize: "23px", wordWrap: { width: 860 } }),
      progress: this.add.text(28, 96, "", { ...textStyle, fontSize: "16px", color: "#ead6ff" }),
      feedback: this.add.text(28, 0, "", { ...textStyle, fontSize: "17px", color: "#fde68a" }),
      instructions: this.add.text(28, 0, "", { ...textStyle, fontSize: "15px", color: "#ded2ef" }),
      leftRune: this.add.text(0, 0, "", { ...textStyle, fontSize: "17px", wordWrap: { width: 150 } }),
      forwardRune: this.add.text(0, 0, "", { ...textStyle, fontSize: "17px", wordWrap: { width: 150 } }),
      rightRune: this.add.text(0, 0, "", { ...textStyle, fontSize: "17px", wordWrap: { width: 150 } }),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time: number, delta: number): void {
    if (!resources) return;
    frameScheduler.tick(delta);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action === "move-left") applyStep("left");
        if (action === "move-up") applyStep("forward");
        if (action === "move-right") applyStep("right");
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const action = normalize({ modality: "pointer", phase: "up", x: input.pointer.x, y: input.pointer.y })[0]?.action;
        if (action === "confirm") {
          const { width } = dimensions(this);
          applyStep(chooseZigguratDirectionFromPointer(pointerXInScene(this, input.pointer.x, width), width));
        }
      }
    }
    updateView(this);
  };

  return {
    key: SORCERER_ZIGGURAT_ID,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: (): SorcererZigguratSnapshot => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown): void => {
        if (typeof state !== "object" || state === null) throw new Error("The Sorcerer's Ziggurat responsive state is invalid");
        context.controller.restore(state as SorcererZigguratSnapshot);
      },
      apkRecompose: (nextComposition: SorcererZigguratSceneContext["composition"]): void => {
        composition = nextComposition;
      },
    },
  };
}

/**
 * Creates a runtime-compatible Phaser cartridge for The Sorcerer's Ziggurat.
 * @returns A sentence-mode RuntimeCartridge that uses procedural graphics.
 */
export function createSorcererZigguratCartridge(): StandardExperienceCartridge {
  let activeController: SorcererZigguratController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: SORCERER_ZIGGURAT_ID,
    title: "The Sorcerer's Ziggurat",
    description: "Climb adjacent rune cubes to rebuild each sentence in order.",
    inputMode: "sentence",
    objective: "Climb the rune cube that contains each next sentence word.",
    mechanicInstruction: "Choose the left, forward, or right adjacent rune cube.",
    keyboardKeys: ["A", "Left Arrow", "W", "Up Arrow", "D", "Right Arrow"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const correctDirection = controller.snapshot().runes.correctDirection;
      controller.step(
        actionId === "action:select-correct"
          ? correctDirection
          : correctDirection === "left" ? "right" : "left",
      );
    },
  });
  return {
    manifest: {
      id: SORCERER_ZIGGURAT_ID,
      title: "The Sorcerer's Ziggurat",
      description: "Climb adjacent rune cubes to rebuild each sentence in order.",
      version: "0.1.0",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: [],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:language-target-progression",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const controller = createSorcererZigguratController(
        input,
         (result) => context.complete(result, "victory"),
        context.seed ?? 0,
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "SORCERER_ZIGGURAT_READY",
        message: "The Sorcerer's Ziggurat rune path is ready.",
        details: { editionId: context.edition.id, sentenceCount: input.length },
      });
      return {
        width: SORCERER_ZIGGURAT_CANVAS.width,
        height: SORCERER_ZIGGURAT_CANVAS.height,
        render: { antialias: true, pixelArt: false },
        scene: createScene({
          controller,
          inputController: context.inputController,
          composition: context.composition,
          totalSentences: input.length,
          diagnostic: context.diagnostic,
          sessionMode: context.sessionMode ?? "playing",
        }),
      };
    },
  };
}
