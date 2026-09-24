import { gameResultsSchema, sentenceInputSchema, type GameResults } from "@reading-advantage/game-contracts";
import {
  createCompletionLatch,
  createInputActionNormalizer,
  calculateXp,
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

/** Stable cartridge identifier retained by existing hosts and results. */
export const SPELLWEAVERS_RUN_ID = "spellweavers-run" as const;

/** Three runner lanes map directly to these semantic actions. */
export const SPELLWEAVERS_RUN_ACTIONS = Object.freeze(["move-left", "confirm", "move-right"] as const);

/** Keyboard bindings for the three runner lanes. */
export const SPELLWEAVERS_RUN_KEYBOARD: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left", KeyA: "move-left",
  ArrowDown: "confirm", KeyS: "confirm",
  ArrowRight: "move-right", KeyD: "move-right",
});

/** Vertical speed of each English word orb in logical pixels per second. */
export const SPELLWEAVERS_RUN_ORB_SPEED = 92;

interface SpellweaverTarget {
  readonly id: string;
  readonly prompt: string;
  readonly answer: string;
}

/** Complete responsive state for one sentence run. */
export interface SpellweaversRunSnapshot {
  readonly seed: number;
  readonly phase: "running" | "victory";
  readonly targetIndex: number;
  readonly targetCount: number;
  readonly prompt: string;
  readonly answer: string;
  readonly choices: readonly [string, string, string];
  readonly correctLane: number;
  readonly builtSentence: string;
  readonly waveIndex: number;
  readonly playerLane: number;
  readonly orbProgress: number;
  readonly correctAnswers: number;
  readonly totalAttempts: number;
  readonly score: number;
  readonly lastOutcome?: "correct" | "incorrect";
  readonly destroyed: boolean;
}

/** Result from one lane selection. */
export interface SpellweaversRunSelection {
  readonly accepted: boolean;
  readonly correct: boolean;
  readonly progressed: boolean;
  readonly completed: boolean;
  readonly snapshot: SpellweaversRunSnapshot;
}

/** Transport-independent sentence runner rules. */
export interface SpellweaversRunController {
  /** Returns the current immutable run state. */
  snapshot(): SpellweaversRunSnapshot;
  /** Selects the English word in one runner lane. */
  choose(action: InputActionId): SpellweaversRunSelection;
  /** Advances the falling English word orbs. */
  tick(deltaMs: number): SpellweaversRunSnapshot;
  /** Captures all state required for responsive recomposition. */
  capture(): SpellweaversRunSnapshot;
  /** Restores a validated state from this exact run. */
  restore(snapshot: SpellweaversRunSnapshot): void;
  /** Seals the run without later result delivery. */
  destroy(): void;
}

function mix32(value: number): number {
  let mixed = value | 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function buildTargets(input: unknown): readonly SpellweaverTarget[] {
  const content = validateNonEmptyContent(sentenceInputSchema.parse(input), "sentence");
  return Object.freeze(content.items.flatMap((item, sentenceIndex) =>
    item.term.trim().split(/\s+/u).filter(Boolean).map((answer, wordIndex) => Object.freeze({
      id: `${sentenceIndex}:${wordIndex}`,
      prompt: item.translation,
      answer,
    })),
  ));
}

function choicesFor(targets: readonly SpellweaverTarget[], index: number, seed: number, waveIndex: number): readonly [string, string, string] {
  const answer = targets[index]!.answer;
  const supplied = [...new Set(targets.map((target) => target.answer).filter((word) => word !== answer))];
  const start = supplied.length === 0 ? 0 : mix32(seed + index * 0x9e3779b9 + waveIndex * 0x27d4eb2d) % supplied.length;
  const distractor = (offset: number): string => supplied.length === 0 ? answer : supplied[(start + offset) % supplied.length]!;
  const lane = mix32(seed ^ Math.imul(index + 1, 0x85ebca6b) ^ Math.imul(waveIndex + 1, 0xc2b2ae35)) % 3;
  const choices: [string, string, string] = [distractor(0), distractor(1), distractor(2)];
  choices[lane] = answer;
  return Object.freeze(choices);
}

/** Creates deterministic rules for one Spellweaver sentence run. */
export function createSpellweaversRunController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
  seed = 0,
): SpellweaversRunController {
  const targets = buildTargets(input);
  const completion = createCompletionLatch(deliver);
  let correctAnswers = 0;
  let totalAttempts = 0;
  let score = 0;
  let phase: SpellweaversRunSnapshot["phase"] = "running";
  let targetIndex = 0;
  let playerLane = 1;
  let orbProgress = 0;
  let waveIndex = 0;
  let lastOutcome: SpellweaversRunSnapshot["lastOutcome"];
  let destroyed = false;

  const snapshot = (): SpellweaversRunSnapshot => {
    const displayIndex = Math.min(targetIndex, targets.length - 1);
    const target = targets[displayIndex]!;
    const choices = choicesFor(targets, displayIndex, seed, waveIndex);
    let sentenceStart = displayIndex;
    while (sentenceStart > 0 && targets[sentenceStart - 1]!.prompt === target.prompt) sentenceStart -= 1;
    const completedEnd = phase === "victory" ? displayIndex + 1 : targetIndex;
    const builtSentence = targets.slice(sentenceStart, completedEnd).map((item) => item.answer).join(" ");
    return Object.freeze({
      seed, phase, targetIndex, targetCount: targets.length,
      prompt: target.prompt, answer: target.answer, choices,
      correctLane: choices.indexOf(target.answer), builtSentence, waveIndex, playerLane, orbProgress,
      correctAnswers, totalAttempts, score, ...(lastOutcome ? { lastOutcome } : {}), destroyed,
    });
  };

  return Object.freeze({
    snapshot,
    choose(action: InputActionId): SpellweaversRunSelection {
      const lane = SPELLWEAVERS_RUN_ACTIONS.indexOf(action as typeof SPELLWEAVERS_RUN_ACTIONS[number]);
      if (destroyed || phase !== "running" || lane < 0) {
        return { accepted: false, correct: false, progressed: false, completed: phase === "victory", snapshot: snapshot() };
      }
      playerLane = lane;
      return { accepted: true, correct: false, progressed: false, completed: false, snapshot: snapshot() };
    },
    tick(deltaMs: number): SpellweaversRunSnapshot {
      if (!destroyed && phase === "running") {
        orbProgress += Math.max(0, Math.min(deltaMs, 250)) * SPELLWEAVERS_RUN_ORB_SPEED / 1000;
        if (orbProgress >= 240) {
          const state = snapshot();
          const correct = state.choices[playerLane] === state.answer;
          totalAttempts += 1;
          if (correct) correctAnswers += 1;
          lastOutcome = correct ? "correct" : "incorrect";
          if (correct) {
            score += 100;
            targetIndex += 1;
            if (targetIndex === targets.length) {
              phase = "victory";
              const accuracy = totalAttempts === 0 ? 0 : correctAnswers / totalAttempts;
              completion.complete(gameResultsSchema.parse({
                correctAnswers, totalAttempts, accuracy, score,
                xp: calculateXp({ correctAnswers, totalAttempts, accuracy }, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
              }));
            }
          }
          waveIndex += 1;
          orbProgress = 0;
        }
      }
      return snapshot();
    },
    capture: snapshot,
    restore(state: SpellweaversRunSnapshot): void {
      if (typeof state !== "object" || state === null) throw new Error("Spellweaver's Run responsive state is invalid");
      const expectedIndex = Number.isInteger(state.targetIndex) && state.targetIndex >= 0 && state.targetIndex <= targets.length;
      const validCounters = Number.isInteger(state.correctAnswers) && state.correctAnswers === state.targetIndex
        && Number.isInteger(state.totalAttempts) && state.totalAttempts >= state.correctAnswers
        && Number.isSafeInteger(state.score) && state.score === state.correctAnswers * 100
        && Number.isInteger(state.waveIndex) && state.waveIndex === state.totalAttempts;
      if (!expectedIndex || !validCounters) throw new Error("Spellweaver's Run responsive state is invalid");
      const displayIndex = Math.min(state.targetIndex, targets.length - 1);
      const expectedChoices = choicesFor(targets, displayIndex, seed, state.waveIndex);
      let sentenceStart = displayIndex;
      while (sentenceStart > 0 && targets[sentenceStart - 1]!.prompt === targets[displayIndex]!.prompt) sentenceStart -= 1;
      const completedEnd = state.phase === "victory" ? displayIndex + 1 : state.targetIndex;
      const expectedBuilt = targets.slice(sentenceStart, completedEnd).map((item) => item.answer).join(" ");
      const valid = expectedIndex
        && state.seed === seed
        && state.targetCount === targets.length
        && state.prompt === targets[displayIndex]!.prompt
        && state.answer === targets[displayIndex]!.answer
        && Array.isArray(state.choices) && state.choices.length === 3
        && state.choices.every((choice, index) => choice === expectedChoices[index])
        && state.correctLane === expectedChoices.indexOf(targets[displayIndex]!.answer)
        && state.builtSentence === expectedBuilt
        && Number.isInteger(state.playerLane) && state.playerLane >= 0 && state.playerLane < 3
        && Number.isFinite(state.orbProgress) && state.orbProgress >= 0 && state.orbProgress < 240
        && typeof state.destroyed === "boolean"
        && (state.totalAttempts === 0 ? state.lastOutcome === undefined : state.lastOutcome === "correct" || state.lastOutcome === "incorrect")
        && (state.phase !== "victory" || state.lastOutcome === "correct")
        && (state.phase !== "victory" || state.orbProgress === 0)
        && state.phase === (state.targetIndex === targets.length ? "victory" : "running");
      if (!valid) throw new Error("Spellweaver's Run responsive state is invalid");
      correctAnswers = state.correctAnswers;
      totalAttempts = state.totalAttempts;
      score = state.score;
      phase = state.phase;
      targetIndex = state.targetIndex;
      playerLane = state.playerLane;
      orbProgress = state.orbProgress;
      waveIndex = state.waveIndex;
      lastOutcome = state.lastOutcome;
      destroyed = state.destroyed;
      if (destroyed) completion.sealWithoutDelivery();
    },
    destroy(): void {
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

interface TextLike { setText(value: string): this; setPosition(x: number, y: number): this; setOrigin?(x: number, y?: number): this; destroy(): void }
interface GraphicsLike {
  clear(): this; fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(width: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}
interface ImageLike { setOrigin?(x: number, y: number): this; setPosition?(x: number, y: number): this; setDisplaySize?(w: number, h: number): this; destroy(): void }
interface SceneLike {
  load?: { image?(key: string, url: string): unknown; spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown };
  add?: { graphics(): GraphicsLike; text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): TextLike; image?(x: number, y: number, key: string): ImageLike; sprite?(x: number, y: number, key: string): ImageLike };
  scale?: { width?: number; height?: number };
  game?: { canvas?: { getBoundingClientRect?(): { left: number; width: number } } };
  events?: { once(event: string, callback: () => void): void };
}

function createScene(context: CartridgeGameConfigContext, controller: SpellweaversRunController): Readonly<Record<string, unknown>> {
  let graphics: GraphicsLike | undefined;
  let prompt: TextLike | undefined;
  let status: TextLike | undefined;
  let choices: readonly TextLike[] = [];
  let player: ImageLike | undefined;
  let previousKeys = new Set<string>();
  let composition = context.composition;
  const normalize = createInputActionNormalizer({ keyboard: SPELLWEAVERS_RUN_KEYBOARD });
  const size = (scene: SceneLike) => ({ width: scene.scale?.width ?? 960, height: scene.scale?.height ?? 540 });
  const render = (scene: SceneLike): void => {
    if (!graphics || !prompt || !status) return;
    const { width, height } = size(scene);
    const state = controller.snapshot();
    const compact = width <= 480 || composition?.profile === "compact";
    const laneWidth = Math.min(compact ? 104 : 220, (width - (compact ? 24 : 100)) / 3);
    const gap = compact ? 6 : 22;
    const startX = (width - laneWidth * 3 - gap * 2) / 2;
    const top = compact ? 150 : 142;
    const bottom = height - (compact ? 100 : 82);
    const orbY = top + (bottom - top) * (state.orbProgress / 240);
    graphics.clear().fillStyle(0x101b2b, 1).fillRect(0, 0, width, height);
    prompt.setText(state.prompt).setPosition(width / 2, compact ? 28 : 34);
    status.setText(state.phase === "victory" ? state.builtSentence : `${state.builtSentence}${state.builtSentence ? "  " : ""}${state.targetIndex + 1}/${state.targetCount}`).setPosition(width / 2, compact ? 104 : 100);
    for (let lane = 0; lane < 3; lane += 1) {
      const x = startX + lane * (laneWidth + gap);
      graphics.fillStyle(0x263a55, 0.92).fillRoundedRect(x, top, laneWidth, bottom - top + 44, 14);
      graphics.lineStyle(state.playerLane === lane ? 4 : 2, state.playerLane === lane ? 0xfbbf24 : 0x7dd3fc, 1).strokeRoundedRect(x, top, laneWidth, bottom - top + 44, 14);
      graphics.fillStyle(0x6d28d9, 1).fillRoundedRect(x + 4, orbY, laneWidth - 8, compact ? 58 : 64, 12);
      choices[lane]?.setText(state.choices[lane]!).setPosition(x + laneWidth / 2, orbY + (compact ? 14 : 16));
    }
    const playerX = startX + state.playerLane * (laneWidth + gap) + laneWidth / 2;
    player?.setPosition?.(playerX, height - (compact ? 36 : 30));
    player?.setDisplaySize?.(compact ? 48 : 60, compact ? 48 : 60);
  };
  const pointerAction = (scene: SceneLike, clientX: number): InputActionId => {
    const { width } = size(scene);
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    const x = rect && rect.width > 0 ? (clientX - rect.left) * width / rect.width : clientX;
    return SPELLWEAVERS_RUN_ACTIONS[Math.max(0, Math.min(2, Math.floor(x / (width / 3))))]!;
  };
  const cleanup = (): void => { controller.destroy(); graphics?.destroy(); prompt?.destroy(); status?.destroy(); choices.forEach((choice) => choice.destroy()); player?.destroy(); };
  return {
    key: SPELLWEAVERS_RUN_ID,
    preload(this: SceneLike): void {
      if (this.load && context.edition.bindings["player:idle"]) preloadAssetBindings(this.load, context.edition, ["player:idle"]);
    },
    create(this: SceneLike): void {
      if (!this.add) throw new Error("Spellweaver's Run requires Phaser display services");
      const { width } = size(this);
      const compact = width <= 480 || composition?.profile === "compact";
      const renderedWidth = this.game?.canvas?.getBoundingClientRect?.().width ?? width;
      const renderedScale = Math.max(0.1, renderedWidth / width);
      const promptFont = Math.min(52, Math.max(compact ? 26 : 32, Math.ceil(18 / renderedScale)));
      const choiceFont = Math.min(48, Math.max(compact ? 18 : 22, Math.ceil(16 / renderedScale)));
      const statusFont = Math.min(46, Math.max(18, Math.ceil(16 / renderedScale)));
      graphics = this.add.graphics();
      prompt = this.add.text(0, 0, "", { fontFamily: "Arial", fontSize: `${promptFont}px`, fontStyle: "bold", color: "#ffffff", align: "center", wordWrap: { width: width - 32, useAdvancedWrap: true } });
      prompt.setOrigin?.(0.5, 0);
      status = this.add.text(0, 0, "", { fontFamily: "Arial", fontSize: `${statusFont}px`, color: "#bfdbfe", align: "center" });
      status.setOrigin?.(0.5, 0);
      choices = SPELLWEAVERS_RUN_ACTIONS.map(() => {
        const label = this.add!.text(0, 0, "", { fontFamily: "Arial", fontSize: `${choiceFont}px`, fontStyle: "bold", color: "#ffffff", align: "center", wordWrap: { width: compact ? 92 : 190, useAdvancedWrap: true } });
        label.setOrigin?.(0.5, 0);
        return label;
      });
      if (context.edition.bindings["player:idle"]) {
        const resolved = resolveAssetBinding(context.edition, "player:idle");
        player = this.add.sprite?.(0, 0, resolved.textureKey) ?? this.add.image?.(0, 0, resolved.textureKey);
        player?.setOrigin?.(0.5, 1);
      }
      this.events?.once("shutdown", cleanup);
      this.events?.once("destroy", cleanup);
      render(this);
    },
    update(this: SceneLike, _time = 0, delta = 16): void {
      if ((context.sessionMode ?? "playing") === "playing") {
        controller.tick(delta);
        const input = context.inputController.snapshot();
        const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
        previousKeys = new Set(input.keys);
        for (const code of pressed) {
          const action = normalize({ modality: "keyboard", code })[0]?.action;
          if (action) controller.choose(action);
        }
        if (input.pointer.released && !input.pointer.cancelled) controller.choose(pointerAction(this, input.pointer.x));
      }
      render(this);
    },
    extend: {
      apkCaptureResponsiveState: () => controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => controller.restore(state as SpellweaversRunSnapshot),
      apkRecompose: (next: CartridgeGameConfigContext["composition"]) => { composition = next; },
    },
  };
}

/** Creates the title-specific Spellweaver's Run sentence cartridge. */
export function createSpellweaversRunCartridge(): StandardExperienceCartridge {
  let active: SpellweaversRunController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: SPELLWEAVERS_RUN_ID,
    title: "Spellweaver's Run",
    description: "Change lanes to collect falling word orbs in sentence order.",
    inputMode: "sentence",
    objective: "Collect each English sentence word for the Thai prompt.",
    mechanicInstruction: "Choose the lane that carries the next English word.",
    keyboardKeys: ["A", "Left Arrow", "S", "Down Arrow", "D", "Right Arrow"],
    executeTutorialAction: (actionId) => {
      const state = active?.snapshot();
      if (!state || !active) return;
      const lane = actionId === "action:select-correct" ? state.correctLane : (state.correctLane + 1) % 3;
      active.choose(SPELLWEAVERS_RUN_ACTIONS[lane]!);
    },
  });
  return {
    manifest: {
      id: SPELLWEAVERS_RUN_ID,
      title: "Spellweaver's Run",
      description: "Change lanes to collect falling word orbs in sentence order.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["spellweavers-run/player-lane"],
      capabilities: ["capability:input-action-normalization", "capability:language-target-progression", "capability:nonempty-content-precondition", "capability:result-accounting", "capability:single-completion-emission", "capability:time-and-frame-loop"],
    },
    standardExperience,
    createGameConfig(context): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const controller = createSpellweaversRunController(input, (result) => context.complete(result, "victory"), context.seed ?? 0);
      active = controller;
      return { width: 960, height: 540, render: { antialias: false, pixelArt: true }, scene: createScene(context, controller) };
    },
  };
}
