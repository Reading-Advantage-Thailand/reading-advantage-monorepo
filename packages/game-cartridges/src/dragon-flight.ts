import {
  gameResultsSchema,
  vocabularyInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  resolveAssetBinding,
  validateNonEmptyContent,
  type APKInputController,
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
export type DragonFlightPhase = "gate" | "complete";

/** Visible translation choices for the current vocabulary target. */
export interface DragonFlightGateOptions {
  /** Label shown on the left gate. */
  readonly left: string;
  /** Label shown on the right gate. */
  readonly right: string;
  /** Correct gate for the current target. */
  readonly correctChoice: DragonFlightGate;
}

/** Immutable state exposed by the transport-independent Dragon Flight rules. */
export interface DragonFlightSnapshot {
  /** Current game phase. */
  readonly phase: DragonFlightPhase;
  /** Index of the vocabulary target shown to the player. */
  readonly targetIndex: number;
  /** Current source-language prompt. */
  readonly prompt: string;
  /** Current gate labels and correct gate. */
  readonly gates: DragonFlightGateOptions;
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
  /** Applies one gate choice and advances only on a correct choice. */
  choose(gate: DragonFlightGate): DragonFlightChoiceResult;
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
  destroy(): void;
}

/** Minimal Phaser text surface used by the procedural scene. */
interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
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
  setTilePosition?(x: number, y: number): this;
  tilePositionY?: number;
  destroy(): void;
}

/** Minimal Phaser canvas surface needed for pointer coordinate conversion. */
interface PhaserCanvasLike {
  getBoundingClientRect?(): { readonly left: number; readonly width: number };
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
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly leftGate: PhaserTextLike;
  readonly rightGate: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  dragon?: PhaserImageLike;
  leftGateArt?: PhaserImageLike;
  rightGateArt?: PhaserImageLike;
}

/** Current Phaser scene options passed to the renderer. */
interface DragonFlightSceneContext {
  readonly controller: DragonFlightController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly totalTargets: number;
  readonly sessionMode: CartridgeGameConfigContext["sessionMode"];
  readonly edition: RuntimeEdition;
}

function cycledDistinctValue(values: readonly string[], startIndex: number): string {
  const current = values[startIndex]!;
  for (let offset = 1; offset < values.length; offset += 1) {
    const candidate = values[(startIndex + offset) % values.length]!;
    if (candidate !== current) return candidate;
  }
  return current;
}

/** Creates the reusable Dragon Flight rules for one vocabulary array. */
export function createDragonFlightController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
): DragonFlightController {
  const parsedInput = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "vocabulary");
  const items = content.items;
  const progression = createLanguageTargetProgression(
    items.map((item) => item.translation),
  );
  let accountant = createResultAccountant();
  const completion = createCompletionLatch(deliver);
  let phase: DragonFlightPhase = "gate";
  let targetIndex = 0;
  let destroyed = false;

  const optionsFor = (index: number): DragonFlightGateOptions => {
    const current = items[index]!;
    const wrongLabel = cycledDistinctValue(
      items.map((item) => item.translation),
      index,
    );
    const correctChoice: DragonFlightGate = index % 2 === 0 ? "left" : "right";
    return Object.freeze({
      left: correctChoice === "left" ? current.translation : wrongLabel,
      right: correctChoice === "right" ? current.translation : wrongLabel,
      correctChoice,
    });
  };

  const snapshot = (): DragonFlightSnapshot => {
    const current = items[Math.min(targetIndex, items.length - 1)];
    return Object.freeze({
      phase,
      targetIndex,
      prompt: current.term,
      gates: optionsFor(Math.min(targetIndex, items.length - 1)),
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      destroyed,
    });
  };

  const restore = (state: DragonFlightSnapshot): void => {
    if (destroyed) return;
    if (state.targetIndex < 0 || state.targetIndex > items.length) {
      throw new Error("Dragon Flight state target index is invalid");
    }
    if (state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts) {
      throw new Error("Dragon Flight state result counters are invalid");
    }
    progression.reset();
    for (let index = 0; index < state.targetIndex; index += 1) {
      progression.match(items[index].translation);
    }
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
    phase = state.phase;
    targetIndex = state.targetIndex;
    destroyed = state.destroyed;
  };

  return Object.freeze({
    snapshot,
    choose(gate: DragonFlightGate): DragonFlightChoiceResult {
      const before = snapshot();
      if (destroyed || phase === "complete") {
        return Object.freeze({
          accepted: false,
          correct: false,
          progressed: false,
          completed: phase === "complete",
          snapshot: before,
        });
      }

      const correct = gate === before.gates.correctChoice;
      accountant.recordAttempt({ correct });
      if (!correct) {
        return Object.freeze({
          accepted: true,
          correct: false,
          progressed: false,
          completed: false,
          snapshot: snapshot(),
        });
      }

      accountant.addScore(100);
      progression.match(items[targetIndex].translation);
      targetIndex += 1;
      if (!progression.isComplete) {
        return Object.freeze({
          accepted: true,
          correct: true,
          progressed: true,
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

function createScene(context: DragonFlightSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let animationMs = 0;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  const flightArt = usesFlightArt(context.edition);
  let parallax: FlightParallaxLayers = { sprites: [], scrollY: 0 };
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

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const centerX = width / 2;
    const gateY = height * 0.62;
    const gateWidth = Math.min(330, width * 0.36);
    const gap = Math.min(48, width * 0.05);
    const leftX = centerX - gateWidth - gap / 2;
    const rightX = centerX + gap / 2;
    const gateHeight = Math.min(126, height * 0.23);
    const pulse = Math.sin(animationMs / 2000 * Math.PI * 2) * 4;

    resources.graphics.clear();
    if (flightArt) {
      if (parallax.sprites.length === 0) {
        parallax = createFlightParallax(scene, context.edition, width, height);
      }
      if (parallax.sprites.length === 0) {
        resources.graphics.fillStyle(0x6eb6e8, 1).fillRect(0, 0, width, height);
      }
      const gateKey = context.edition.bindings["prop:gate"]
        ? resolveAssetBinding(context.edition, "prop:gate").textureKey
        : undefined;
      const dragonKey = context.edition.bindings["player:idle"]
        ? resolveAssetBinding(context.edition, "player:idle").textureKey
        : undefined;
      const place = (current: PhaserImageLike | undefined, x: number, y: number, key: string, size: number): PhaserImageLike | undefined => {
        const image = current
          ?? scene.add?.sprite?.(x, y, key)
          ?? scene.add?.image?.(x, y, key);
        image?.setOrigin?.(0.5, 0.5);
        image?.setPosition?.(x, y);
        image?.setDisplaySize?.(size, size);
        image?.setDepth?.(6);
        return image;
      };
      if (gateKey) {
        resources.leftGateArt = place(resources.leftGateArt, leftX + gateWidth / 2, gateY + gateHeight / 2, gateKey, 120);
        resources.rightGateArt = place(resources.rightGateArt, rightX + gateWidth / 2, gateY + gateHeight / 2, gateKey, 120);
      }
      if (dragonKey) {
        resources.dragon = place(resources.dragon, centerX, height * 0.82 + pulse, dragonKey, 96);
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
      resources.graphics.fillStyle(0x255f86, 1).fillRoundedRect(leftX, gateY, gateWidth, gateHeight, 18);
      resources.graphics.fillStyle(0x255f86, 1).fillRoundedRect(rightX, gateY, gateWidth, gateHeight, 18);
      resources.graphics.lineStyle(4, 0x8ef0ff, 0.9).strokeRoundedRect(leftX, gateY, gateWidth, gateHeight, 18);
      resources.graphics.lineStyle(4, 0xffd166, 0.9).strokeRoundedRect(rightX, gateY, gateWidth, gateHeight, 18);
    }

    resources.title.setText("DRAGON FLIGHT");
    resources.prompt.setText(`Which gate means: ${state.prompt}?`);
    resources.progress.setText(
      `${composition?.profile === "compact" ? "Compact flight" : "Sky route"}  •  Gate ${Math.min(state.targetIndex + 1, context.totalTargets)} of ${context.totalTargets}`,
    );
    resources.leftGate.setText(state.gates.left).setPosition(leftX + 24, gateY + gateHeight / 2 - 12);
    resources.rightGate.setText(state.gates.right).setPosition(rightX + 24, gateY + gateHeight / 2 - 12);
    resources.feedback
      .setText(state.phase === "complete" ? "Sky bridge secured!" : "Choose a translation gate")
      .setPosition(32, height - 70);
    resources.instructions
      .setText("Keyboard: A / ← or D / →   •   Touch or click a gate")
      .setPosition(32, height - 38);
  };

  const cleanup = (): void => {
    frameScheduler.cancel();
    if (!resources) return;
    context.controller.destroy();
    destroyFlightParallax(parallax);
    resources.dragon?.destroy();
    resources.leftGateArt?.destroy();
    resources.rightGateArt?.destroy();
    resources.graphics.destroy();
    resources.title.destroy();
    resources.prompt.destroy();
    resources.progress.destroy();
    resources.leftGate.destroy();
    resources.rightGate.destroy();
    resources.feedback.destroy();
    resources.instructions.destroy();
    resources = undefined;
    previousKeys = new Set<string>();
  };

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load || !flightArt) return;
    preloadFlightParallax(this, context.edition);
    const keys = ["player:idle", "prop:gate"].filter((key) => Boolean(context.edition.bindings[key]));
    if (keys.length) preloadAssetBindings(this.load, context.edition, keys);
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Dragon Flight requires Phaser display services");
    const textStyle = { fontFamily: "Arial", color: "#f6fbff", fontSize: "24px", align: "center" };
    resources = {
      graphics: this.add.graphics(),
      title: this.add.text(32, 22, "DRAGON FLIGHT", { ...textStyle, fontSize: "30px", fontStyle: "bold" }),
      prompt: this.add.text(32, 70, "", { ...textStyle, fontSize: "26px" }),
      progress: this.add.text(32, 112, "", { ...textStyle, fontSize: "16px", color: "#9ddcff" }),
      leftGate: this.add.text(0, 0, "", { ...textStyle, fontSize: "19px", wordWrap: { width: 280 } }),
      rightGate: this.add.text(0, 0, "", { ...textStyle, fontSize: "19px", wordWrap: { width: 280 } }),
      feedback: this.add.text(0, 0, "", { ...textStyle, fontSize: "18px", color: "#ffd166" }),
      instructions: this.add.text(0, 0, "", { ...textStyle, fontSize: "16px", color: "#b4c7e7" }),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
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
        if (action === "move-left") context.controller.choose("left");
        if (action === "move-right") context.controller.choose("right");
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const action = normalize({ modality: "pointer", phase: "up", x: input.pointer.x, y: input.pointer.y })[0]?.action;
        if (action === "confirm") {
          const { width } = dimensions(this);
          const localX = pointerXInScene(this, input.pointer.x, width);
          context.controller.choose(chooseGateFromPointer(localX, width));
        }
      }
    }
    updateView(this);
  };

  return {
    key: DRAGON_FLIGHT_ID,
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
        composition = nextComposition;
      },
    },
  };
}

/** Creates a runtime-compatible Phaser 4 cartridge for one vocabulary session. */
export function createDragonFlightCartridge(): StandardExperienceCartridge {
  let activeController: DragonFlightController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: DRAGON_FLIGHT_ID,
    title: "Dragon Flight",
    description: "Choose the correct translation gate to guide a dragon through the clouds.",
    inputMode: "vocabulary",
    objective: "Guide the dragon through each gate that matches the vocabulary prompt.",
    mechanicInstruction: "Choose the left or right translation gate.",
    keyboardKeys: ["A", "Left Arrow", "D", "Right Arrow"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
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
      id: DRAGON_FLIGHT_ID,
      title: "Dragon Flight",
      description: "Choose the correct translation gate to guide a dragon through the clouds.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
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
      const input = vocabularyInputSchema.parse(context.input);
       const controller = createDragonFlightController(input, (result) => context.complete(result, "victory"));
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "DRAGON_FLIGHT_READY",
        message: "Dragon Flight gate choices are ready",
        details: { editionId: context.edition.id, targetCount: input.length },
      });
      return {
        width: DRAGON_FLIGHT_CANVAS.width,
        height: DRAGON_FLIGHT_CANVAS.height,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
          controller,
          inputController: context.inputController,
          composition: context.composition,
          totalTargets: input.length,
          sessionMode: context.sessionMode ?? "playing",
          edition: context.edition,
        }),
      };
    },
  };
}
