import { gameResultsSchema, sentenceInputSchema, type GameResults } from "@reading-advantage/game-contracts";
import {
  calculateXp,
  createCompletionLatch,
  preloadAssetBindings,
  resolveAssetBinding,
  validateNonEmptyContent,
  type CartridgeGameConfigContext,
  type CompletionDelivery,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable historical identifier for Shadow Gate Dungeon. */
export const SHADOW_GATE_DUNGEON_ID = "shadow-gate-dungeon" as const;
/** Logical dungeon size before host scaling. */
export const SHADOW_GATE_DUNGEON_CANVAS = Object.freeze({ width: 960, height: 540 });
/** Player movement speed in logical pixels per second. */
export const SHADOW_GATE_PLAYER_SPEED = 190;
/** Creature pursuit speed in logical pixels per second. */
export const SHADOW_GATE_CREATURE_SPEED = 58;
/** Identical fill used by every English crystal to prevent answer disclosure. */
export const SHADOW_GATE_CRYSTAL_COLOR = 0x5b5bd6;
/** Reachable logical gate center below the live target HUD. */
export const SHADOW_GATE_EXIT = Object.freeze({ x: 880, y: 160 });

/**
 * Scales one logical dungeon point into the current scene.
 * @param point Logical point in the 960 by 540 dungeon.
 * @param width Current scene width.
 * @param height Current scene height.
 * @returns The point in current scene coordinates.
 */
export function scaleShadowGatePoint(point: Readonly<{ x: number; y: number }>, width: number, height: number): Readonly<{ x: number; y: number }> {
  return Object.freeze({ x: point.x * width / SHADOW_GATE_DUNGEON_CANVAS.width, y: point.y * height / SHADOW_GATE_DUNGEON_CANVAS.height });
}

/**
 * Returns the common crystal color without using answer correctness.
 * @returns The shared neutral crystal color.
 */
export function colorForShadowGateCrystal(): number {
  return SHADOW_GATE_CRYSTAL_COLOR;
}

/**
 * Wraps a long English crystal label without removing any graphemes.
 * @param word Supplied English word.
 * @param lineLength Maximum grapheme count on one line.
 * @returns The complete label with bounded line breaks.
 */
export function wrapShadowGateCrystalLabel(word: string, lineLength = 9): string {
  const graphemes = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(word)].map((part) => part.segment);
  const lines: string[] = [];
  for (let index = 0; index < graphemes.length; index += lineLength) lines.push(graphemes.slice(index, index + lineLength).join(""));
  return lines.join("\n");
}

interface Target { readonly prompt: string; readonly answer: string }
/** One supplied English crystal in the dungeon. */
export interface ShadowGateCrystal { readonly id: string; readonly word: string; readonly x: number; readonly y: number }
/** Complete state required to restore one dungeon run. */
export interface ShadowGateDungeonSnapshot {
  readonly seed: number;
  readonly phase: "explore" | "gate-open" | "victory";
  readonly targetIndex: number;
  readonly targetCount: number;
  readonly prompt: string;
  readonly answer: string;
  readonly builtSentence: string;
  readonly player: Readonly<{ x: number; y: number }>;
  readonly creature: Readonly<{ x: number; y: number }>;
  readonly movement: Readonly<{ x: number; y: number }>;
  readonly crystals: readonly ShadowGateCrystal[];
  readonly gate: Readonly<{ x: number; y: number; unlocked: boolean }>;
  readonly waveIndex: number;
  readonly hazardContacts: number;
  readonly hazardCooldownMs: number;
  readonly correctAnswers: number;
  readonly totalAttempts: number;
  readonly score: number;
  readonly lastOutcome?: "correct" | "incorrect" | "hazard";
  readonly destroyed: boolean;
}
/** Transport-independent Shadow Gate rules. */
export interface ShadowGateDungeonController {
  /** Returns the immutable current state. */
  snapshot(): ShadowGateDungeonSnapshot;
  /**
   * Sets normalized movement for the next frame.
   * @param x Horizontal movement from negative one to one.
   * @param y Vertical movement from negative one to one.
   * @returns Nothing.
   */
  setMovement(x: number, y: number): void;
  /**
   * Advances movement, pursuit, and physical contacts.
   * @param deltaMs Elapsed frame time in milliseconds.
   * @returns The state after the bounded frame.
   */
  tick(deltaMs: number): ShadowGateDungeonSnapshot;
  /** Captures the complete responsive state. */
  capture(): ShadowGateDungeonSnapshot;
  /** Restores one validated responsive state. */
  restore(snapshot: ShadowGateDungeonSnapshot): void;
  /** Permanently seals this run. */
  destroy(): void;
}

function mix32(value: number): number {
  let mixed = value | 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function distance(a: Readonly<{ x: number; y: number }>, b: Readonly<{ x: number; y: number }>): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function targetsFor(input: unknown): readonly Target[] {
  const content = validateNonEmptyContent(sentenceInputSchema.parse(input), "sentence");
  return Object.freeze(content.items.flatMap((item) => item.term.trim().split(/\s+/u).filter(Boolean).map((answer) => Object.freeze({ prompt: item.translation, answer }))));
}
function crystalSet(targets: readonly Target[], targetIndex: number, seed: number, wave: number): readonly ShadowGateCrystal[] {
  const answer = targets[Math.min(targetIndex, targets.length - 1)]!.answer;
  const supplied = [...new Set(targets.map((target) => target.answer).filter((word) => word !== answer))];
  const start = supplied.length ? mix32(seed + targetIndex * 7919 + wave * 104729) % supplied.length : 0;
  const words = [answer, supplied[start] ?? answer, supplied[(start + 1) % Math.max(1, supplied.length)] ?? answer];
  const answerSlot = mix32(seed ^ Math.imul(targetIndex + 1, 2246822519) ^ wave) % 3;
  [words[0], words[answerSlot]] = [words[answerSlot]!, words[0]!];
  const spots = [{ x: 190, y: 190 }, { x: 480, y: 330 }, { x: 760, y: 175 }];
  const rotation = mix32(seed + wave * 31) % 3;
  return Object.freeze(words.map((word, index) => Object.freeze({ id: `wave:${wave}:${index}`, word: word!, ...spots[(index + rotation) % 3]! })));
}

/**
 * Creates one deterministic dungeon controller.
 * @param input Sentence content with English terms and translated prompts.
 * @param deliver Completion delivery owned by the host.
 * @param seed Deterministic placement seed.
 * @returns A controller for movement, collisions, pursuit, and restoration.
 */
export function createShadowGateDungeonController(input: unknown, deliver: CompletionDelivery<GameResults>, seed = 0): ShadowGateDungeonController {
  const targets = targetsFor(input);
  const completion = createCompletionLatch(deliver);
  let phase: ShadowGateDungeonSnapshot["phase"] = "explore";
  let targetIndex = 0;
  let player = { x: 480, y: 460 };
  let creature = { x: 820, y: 410 };
  let movement = { x: 0, y: 0 };
  let waveIndex = 0;
  let hazardContacts = 0;
  let correctAnswers = 0;
  let totalAttempts = 0;
  let score = 0;
  let lastOutcome: ShadowGateDungeonSnapshot["lastOutcome"];
  let destroyed = false;
  let hazardCooldown = 0;
  const gate = SHADOW_GATE_EXIT;
  const snapshot = (): ShadowGateDungeonSnapshot => {
    const displayIndex = Math.min(targetIndex, targets.length - 1);
    const target = targets[displayIndex]!;
    let start = displayIndex;
    while (start > 0 && targets[start - 1]!.prompt === target.prompt) start -= 1;
    const end = phase === "explore" ? targetIndex : displayIndex + 1;
    return Object.freeze({
      seed, phase, targetIndex, targetCount: targets.length, prompt: target.prompt, answer: target.answer,
      builtSentence: targets.slice(start, end).map((item) => item.answer).join(" "),
      player: Object.freeze({ ...player }), creature: Object.freeze({ ...creature }), movement: Object.freeze({ ...movement }),
      crystals: phase === "explore" ? crystalSet(targets, targetIndex, seed, waveIndex) : Object.freeze([]),
      gate: Object.freeze({ ...gate, unlocked: phase !== "explore" }), waveIndex, hazardContacts, hazardCooldownMs: hazardCooldown,
      correctAnswers, totalAttempts, score, ...(lastOutcome ? { lastOutcome } : {}), destroyed,
    });
  };
  const finish = (): void => {
    phase = "victory";
    const accuracy = totalAttempts === 0 ? 0 : correctAnswers / totalAttempts;
    completion.complete(gameResultsSchema.parse({ correctAnswers, totalAttempts, accuracy, score, xp: calculateXp({ correctAnswers, totalAttempts, accuracy }, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }) }));
  };
  return Object.freeze({
    snapshot,
    setMovement(x: number, y: number): void {
      if (destroyed || phase === "victory") return;
      const magnitude = Math.hypot(x, y);
      movement = magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
    },
    tick(deltaMs: number): ShadowGateDungeonSnapshot {
      if (destroyed || phase === "victory") return snapshot();
      const elapsedMs = Math.max(0, Math.min(deltaMs, 100));
      const seconds = elapsedMs / 1000;
      player = { x: clamp(player.x + movement.x * SHADOW_GATE_PLAYER_SPEED * seconds, 54, 906), y: clamp(player.y + movement.y * SHADOW_GATE_PLAYER_SPEED * seconds, 130, 486) };
      const dx = player.x - creature.x;
      const dy = player.y - creature.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      creature = { x: clamp(creature.x + dx / length * SHADOW_GATE_CREATURE_SPEED * seconds, 48, 912), y: clamp(creature.y + dy / length * SHADOW_GATE_CREATURE_SPEED * seconds, 125, 492) };
      hazardCooldown = Math.max(0, hazardCooldown - elapsedMs);
      if (hazardCooldown === 0 && distance(player, creature) <= 42) {
        hazardContacts += 1;
        lastOutcome = "hazard";
        hazardCooldown = 900;
        player = { x: clamp(player.x + dx / length * 70, 54, 906), y: clamp(player.y + dy / length * 70, 130, 486) };
      }
      if (phase === "explore") {
        const touched = crystalSet(targets, targetIndex, seed, waveIndex).find((crystal) => distance(player, crystal) <= 46);
        if (touched) {
          const correct = touched.word === targets[targetIndex]!.answer;
          totalAttempts += 1;
          if (correct) {
            correctAnswers += 1;
            score += 100;
            targetIndex += 1;
            lastOutcome = "correct";
            if (targetIndex === targets.length) phase = "gate-open";
          } else {
            lastOutcome = "incorrect";
          }
          waveIndex += 1;
          player = { x: 480, y: 460 };
        }
      } else if (distance(player, gate) <= 48) finish();
      return snapshot();
    },
    capture: snapshot,
    restore(state: ShadowGateDungeonSnapshot): void {
      if (typeof state !== "object" || state === null) throw new Error("Shadow Gate Dungeon responsive state is invalid");
      const countersValid = Number.isInteger(state.targetIndex) && state.targetIndex >= 0 && state.targetIndex <= targets.length
        && Number.isInteger(state.correctAnswers) && state.correctAnswers === state.targetIndex
        && Number.isInteger(state.totalAttempts) && state.totalAttempts >= state.correctAnswers
        && Number.isInteger(state.waveIndex) && state.waveIndex === state.totalAttempts
        && Number.isInteger(state.hazardContacts) && state.hazardContacts >= 0
        && Number.isFinite(state.hazardCooldownMs) && state.hazardCooldownMs >= 0 && state.hazardCooldownMs <= 900
        && state.score === state.correctAnswers * 100;
      if (!countersValid) throw new Error("Shadow Gate Dungeon responsive state is invalid");
      const displayIndex = Math.min(state.targetIndex, targets.length - 1);
      const expectedPhase = state.targetIndex === targets.length ? (state.phase === "victory" ? "victory" : "gate-open") : "explore";
      const expectedCrystals = expectedPhase === "explore" ? crystalSet(targets, state.targetIndex, seed, state.waveIndex) : [];
      let sentenceStart = displayIndex;
      while (sentenceStart > 0 && targets[sentenceStart - 1]!.prompt === targets[displayIndex]!.prompt) sentenceStart -= 1;
      const sentenceEnd = expectedPhase === "explore" ? state.targetIndex : displayIndex + 1;
      const expectedBuilt = targets.slice(sentenceStart, sentenceEnd).map((target) => target.answer).join(" ");
      const pointValid = (point: Readonly<{ x: number; y: number }> | undefined) => Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
      const valid = state.seed === seed && state.targetCount === targets.length && state.phase === expectedPhase
        && state.prompt === targets[displayIndex]!.prompt && state.answer === targets[displayIndex]!.answer
        && state.builtSentence === expectedBuilt
        && pointValid(state.player) && pointValid(state.creature) && pointValid(state.movement)
        && state.player.x >= 54 && state.player.x <= 906 && state.player.y >= 130 && state.player.y <= 486
        && Array.isArray(state.crystals) && state.crystals.length === expectedCrystals.length && state.crystals.every((crystal, index) => JSON.stringify(crystal) === JSON.stringify(expectedCrystals[index]))
        && Boolean(state.gate) && state.gate.x === gate.x && state.gate.y === gate.y && state.gate.unlocked === (state.phase !== "explore")
        && typeof state.destroyed === "boolean";
      if (!valid) throw new Error("Shadow Gate Dungeon responsive state is invalid");
      phase = state.phase; targetIndex = state.targetIndex; player = { ...state.player }; creature = { ...state.creature }; movement = { ...state.movement };
      waveIndex = state.waveIndex; hazardContacts = state.hazardContacts; correctAnswers = state.correctAnswers; totalAttempts = state.totalAttempts;
      hazardCooldown = state.hazardCooldownMs; score = state.score; lastOutcome = state.lastOutcome; destroyed = state.destroyed;
      if (destroyed) completion.sealWithoutDelivery();
    },
    destroy(): void { destroyed = true; completion.sealWithoutDelivery(); },
  });
}

interface G { clear(): this; fillStyle(c: number, a?: number): this; fillRect(x: number, y: number, w: number, h: number): this; fillCircle(x: number, y: number, r: number): this; fillRoundedRect(x: number, y: number, w: number, h: number, r?: number): this; destroy(): void }
interface T { setText(v: string): this; setPosition(x: number, y: number): this; setOrigin?(x: number, y?: number): this; destroy(): void }
interface I { setPosition?(x: number, y: number): this; setDisplaySize?(w: number, h: number): this; setOrigin?(x: number, y: number): this; destroy(): void }
interface S { load?: { image?(k: string, u: string): unknown; spritesheet?(k: string, u: string, c: { frameWidth: number; frameHeight: number }): unknown }; add?: { graphics(): G; text(x: number, y: number, v: string, s?: Readonly<Record<string, unknown>>): T; image?(x: number, y: number, k: string): I; sprite?(x: number, y: number, k: string): I; tileSprite?(x: number, y: number, w: number, h: number, k: string): I }; scale?: { width?: number; height?: number }; game?: { canvas?: { getBoundingClientRect?(): { left: number; top: number; width: number; height: number } } }; events?: { once(e: string, f: () => void): void } }

function sceneFor(context: CartridgeGameConfigContext, controller: ShadowGateDungeonController): Readonly<Record<string, unknown>> {
  let graphics: G | undefined; let prompt: T | undefined; let progress: T | undefined; let labels: readonly T[] = []; let playerSprite: I | undefined; let enemySprite: I | undefined; let ground: I | undefined;
  let composition = context.composition;
  const size = (scene: S) => ({ width: scene.scale?.width ?? 960, height: scene.scale?.height ?? 540 });
  const cleanup = () => { controller.destroy(); graphics?.destroy(); prompt?.destroy(); progress?.destroy(); labels.forEach((label) => label.destroy()); playerSprite?.destroy(); enemySprite?.destroy(); ground?.destroy(); };
  const render = (scene: S) => {
    if (!graphics || !prompt || !progress) return;
    const state = controller.snapshot(); const { width, height } = size(scene);
    graphics.clear().fillStyle(0x11131a, 1).fillRect(0, 0, width, height);
    graphics.fillStyle(0x202636, 0.62).fillRoundedRect(18, 112, width - 36, height - 126, 18);
    const cardWidth = width <= 480 ? 96 : 240;
    for (const crystal of state.crystals) { const point = scaleShadowGatePoint(crystal, width, height); graphics.fillStyle(colorForShadowGateCrystal(), 1).fillRoundedRect(point.x - cardWidth / 2, point.y - 34, cardWidth, 68, 12); }
    const gatePoint = scaleShadowGatePoint(state.gate, width, height);
    graphics.fillStyle(state.gate.unlocked ? 0x22c55e : 0x475569, 1).fillRoundedRect(gatePoint.x - 28, gatePoint.y - 30, 56, 60, 8);
    prompt.setText(state.prompt).setPosition(width / 2, 20);
    progress.setText(state.phase === "gate-open" ? state.builtSentence : `${state.builtSentence}${state.builtSentence ? "  " : ""}${state.targetIndex + 1}/${state.targetCount}`).setPosition(width / 2, 78);
    state.crystals.forEach((crystal, index) => { const point = scaleShadowGatePoint(crystal, width, height); labels[index]?.setText(wrapShadowGateCrystalLabel(crystal.word)).setPosition(point.x, point.y - 24); });
    for (let index = state.crystals.length; index < labels.length; index += 1) labels[index]?.setText("");
    const playerPoint = scaleShadowGatePoint(state.player, width, height); const creaturePoint = scaleShadowGatePoint(state.creature, width, height);
    playerSprite?.setPosition?.(playerPoint.x, playerPoint.y); enemySprite?.setPosition?.(creaturePoint.x, creaturePoint.y);
  };
  return { key: SHADOW_GATE_DUNGEON_ID,
    preload(this: S) { if (!this.load) return; const keys = ["player:idle", "enemy:idle"].filter((key) => Boolean(context.edition.bindings[key])); if (keys.length) preloadAssetBindings(this.load, context.edition, keys); },
    create(this: S) {
      if (!this.add) throw new Error("Shadow Gate Dungeon requires Phaser display services"); const { width } = size(this); const rectWidth = this.game?.canvas?.getBoundingClientRect?.().width ?? width; const scale = Math.max(0.1, rectWidth / width); const compact = width <= 480 || composition?.profile === "compact";
      graphics = this.add.graphics(); prompt = this.add.text(0, 0, "", { fontFamily: "Arial", fontSize: `${Math.min(52, Math.max(compact ? 26 : 32, Math.ceil(18 / scale)))}px`, fontStyle: "bold", color: "#ffffff", align: "center", wordWrap: { width: width - 30, useAdvancedWrap: true } }); prompt.setOrigin?.(0.5, 0);
      progress = this.add.text(0, 0, "", { fontFamily: "Arial", fontSize: `${Math.min(46, Math.max(18, Math.ceil(16 / scale)))}px`, color: "#bfdbfe", align: "center" }); progress.setOrigin?.(0.5, 0);
      labels = [0, 1, 2].map(() => { const label = this.add!.text(0, 0, "", { fontFamily: "Arial", fontSize: `${Math.min(46, Math.max(18, Math.ceil(16 / scale)))}px`, color: "#ffffff", fontStyle: "bold", align: "center" }); label.setOrigin?.(0.5, 0); return label; });
      const actorSize = Math.min(128, Math.max(52, Math.ceil(44 / scale)));
      const addBound = (key: string) => { if (!context.edition.bindings[key]) return undefined; const resolved = resolveAssetBinding(context.edition, key); const image = this.add!.sprite?.(0, 0, resolved.textureKey) ?? this.add!.image?.(0, 0, resolved.textureKey); image?.setOrigin?.(0.5, 0.5); image?.setDisplaySize?.(actorSize, actorSize); return image; };
      playerSprite = addBound("player:idle"); enemySprite = addBound("enemy:idle"); this.events?.once("shutdown", cleanup); this.events?.once("destroy", cleanup); render(this);
    },
    update(this: S, _time = 0, delta = 16) {
      if ((context.sessionMode ?? "playing") === "playing") { const input = context.inputController.snapshot(); const keys = new Set(input.keys); let dx = Number(keys.has("ArrowRight") || keys.has("KeyD")) - Number(keys.has("ArrowLeft") || keys.has("KeyA")); let dy = Number(keys.has("ArrowDown") || keys.has("KeyS")) - Number(keys.has("ArrowUp") || keys.has("KeyW"));
        if (dx === 0 && dy === 0 && input.pointer.down && !input.pointer.cancelled) { const { width, height } = size(this); const rect = this.game?.canvas?.getBoundingClientRect?.(); const px = rect && rect.width ? (input.pointer.x - rect.left) * width / rect.width : input.pointer.x; const py = rect && rect.height ? (input.pointer.y - rect.top) * height / rect.height : input.pointer.y; const state = controller.snapshot(); dx = px - state.player.x * width / 960; dy = py - state.player.y * height / 540; const length = Math.hypot(dx, dy); if (length < 8) { dx = 0; dy = 0; } else { dx /= length; dy /= length; } }
        controller.setMovement(dx, dy); controller.tick(delta); }
      render(this);
    },
    extend: { apkCaptureResponsiveState: () => controller.capture(), apkRestoreResponsiveState: (state: unknown) => controller.restore(state as ShadowGateDungeonSnapshot), apkRecompose: (next: CartridgeGameConfigContext["composition"]) => { composition = next; void composition; } },
  };
}

/**
 * Creates the title-specific Shadow Gate Dungeon cartridge.
 * @returns A standard cartridge with dungeon movement and sentence collection.
 */
export function createShadowGateDungeonCartridge(): StandardExperienceCartridge {
  let active: ShadowGateDungeonController | undefined;
  const standardExperience = createCartridgeStandardExperience({ id: SHADOW_GATE_DUNGEON_ID, title: "Shadow Gate Dungeon", description: "Explore the dungeon and collect ordered word crystals before opening the gate.", inputMode: "sentence", objective: "Collect the English sentence words for the Thai prompt, then enter the gate.", mechanicInstruction: "Move through each word crystal in sentence order.", keyboardKeys: ["W", "A", "S", "D", "Arrow keys"], executeTutorialAction: (id) => { const state = active?.snapshot(); if (!active || !state) return; const crystal = state.crystals.find((item) => id === "action:select-correct" ? item.word === state.answer : item.word !== state.answer); if (!crystal) return; active.setMovement(crystal.x - state.player.x, crystal.y - state.player.y); } });
  return { manifest: { id: SHADOW_GATE_DUNGEON_ID, title: "Shadow Gate Dungeon", description: "Explore the dungeon and collect ordered word crystals before opening the gate.", runtimeApiVersion: "1.0.0", inputMode: "sentence", requiredAssetBindings: ["shadow-gate-dungeon/player"], capabilities: ["capability:input-action-normalization", "capability:language-target-progression", "capability:nonempty-content-precondition", "capability:result-accounting", "capability:single-completion-emission", "capability:time-and-frame-loop"] }, standardExperience,
    createGameConfig(context) { const input = sentenceInputSchema.parse(context.input); const controller = createShadowGateDungeonController(input, (result) => context.complete(result, "victory"), context.seed ?? 0); active = controller; return { width: 960, height: 540, render: { antialias: false, pixelArt: true }, scene: sceneFor(context, controller) }; },
  };
}
