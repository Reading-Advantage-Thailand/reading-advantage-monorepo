import {
  sentenceInputSchema,
  gameResultsSchema,
  type GameResults,
  type SentenceInput,
} from "@reading-advantage/game-contracts";
import {
  createActorSpriteLayer,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  type ActorSpriteLayer,
  type ActorSpriteLike,
  type APKInputController,
  type CartridgeGameConfigContext,
  type GameTerminalOutcome,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for Village Guardian. */
export const VILLAGE_GUARDIAN_ID = "village-guardian" as const;

/** Phaser canvas size used before host composition scales the scene. */
export const VILLAGE_GUARDIAN_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Distance moved by one accepted directional action. */
export const VILLAGE_GUARDIAN_MOVE_STEP = 24;

/** World-space gap maintained between the guardian and each rescued villager. */
export const VILLAGE_GUARDIAN_TRAIL_SPACING = 72;

/** Time removed when a wrong villager is touched. */
export const VILLAGE_GUARDIAN_WRONG_TIME_PENALTY_MS = 2_000;

/** Time that a wrong villager remains hidden. */
export const VILLAGE_GUARDIAN_HIDE_DURATION_MS = 2_000;

/** Starting lives for one guardian session. */
export const VILLAGE_GUARDIAN_INITIAL_LIVES = 3;

/** Starting time for each sentence level. */
export const VILLAGE_GUARDIAN_TIME_LIMIT_MS = 25_000;

/** Four movement actions accepted by Village Guardian. */
export const VILLAGE_GUARDIAN_ACTIONS = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
] as const);

/** Keyboard bindings for four-way guardian movement. */
export const VILLAGE_GUARDIAN_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
});

/** Position in the deterministic rescue arena. */
export interface VillageGuardianPosition {
  /** Horizontal arena coordinate. */
  readonly x: number;
  /** Vertical arena coordinate. */
  readonly y: number;
}

/** One ordered villager displayed in the current sentence level. */
export interface VillageGuardianVillager extends VillageGuardianPosition {
  /** Stable villager identifier. */
  readonly id: string;
  /** Local sentence level index. */
  readonly level: number;
  /** Local word order within the level. */
  readonly orderIndex: number;
  /** Sentence word carried by the villager. */
  readonly word: string;
  /** Whether the villager already joins the trail. */
  readonly collected: boolean;
  /** Whether the villager is temporarily hidden. */
  readonly hiding: boolean;
  /** Elapsed session time when hiding ends. */
  readonly hiddenUntilMs: number;
}

/** One villager record in the guardian trail. */
export interface VillageGuardianTrailSegment extends VillageGuardianPosition {
  /** Stable trail segment identifier. */
  readonly id: string;
  /** Sentence level that owns the segment. */
  readonly level: number;
  /** Local word order that the segment represents. */
  readonly orderIndex: number;
  /** Sentence word carried by the segment. */
  readonly word: string;
}

/** Deterministic monster position and movement vector. */
export interface VillageGuardianMonster extends VillageGuardianPosition {
  /** Stable monster identifier. */
  readonly id: string;
  /** Horizontal velocity in arena units per millisecond. */
  readonly velocityX: number;
  /** Vertical velocity in arena units per millisecond. */
  readonly velocityY: number;
}

/** Sanctuary position used by every sentence level. */
export interface VillageGuardianSanctuary extends VillageGuardianPosition {
  /** Collision radius around the sanctuary. */
  readonly radius: number;
}

/** Controller configuration for deterministic tests and host sessions. */
export interface VillageGuardianOptions {
  /** Optional deterministic seed for all session placements and hazards. */
  readonly seed?: number;
  /** Enables the deterministic wrong villager used by safe tutorial demonstrations. */
  readonly tutorialOnly?: boolean;
  /** Optional starting time per sentence level. */
  readonly timeLimitMs?: number;
  /** Optional wrong-villager time penalty. */
  readonly wrongTimePenaltyMs?: number;
  /** Optional starting life count. */
  readonly initialLives?: number;
}

/** Active or terminal Village Guardian phase. */
export type VillageGuardianPhase = "playing" | "victory" | "defeat";

/** Learning or hazard event shown by the scene. */
export type VillageGuardianEvent =
  | "correct-villager"
  | "wrong-villager"
  | "monster-disrupted-trail"
  | "monster-hit-guardian"
  | "sanctuary-reached"
  | "final-sanctuary"
  | "timer-expired"
  | "tutorial-incorrect";

/** Shared learning outcome reported by the Village Guardian snapshot. */
export type VillageGuardianOutcome = "correct" | "incorrect" | "hazard" | "sanctuary";

/** Immutable state exposed by the bespoke Village Guardian controller. */
export interface VillageGuardianSnapshot {
  /** Deterministic seed used for placements and hazards. */
  readonly seed: number;
  /** Current session phase. */
  readonly phase: VillageGuardianPhase;
  /** Recognizable mechanic identifier. */
  readonly mechanic: "ordered-villager-trail";
  /** One-based sentence level. */
  readonly level: number;
  /** Number of sentence levels in the session. */
  readonly levelCount: number;
  /** Global index of the next sentence word. */
  readonly targetIndex: number;
  /** Total sentence words in the session. */
  readonly targetCount: number;
  /** Index of the next word within the current level. */
  readonly levelTargetIndex: number;
  /** Translation prompt for the current level. */
  readonly prompt: string;
  /** Current sentence word answer. */
  readonly answer: string;
  /** Movement action that points toward the current villager. */
  readonly correctAction: VillageGuardianMoveAction;
  /** All movement actions accepted by the controller. */
  readonly availableActions: readonly VillageGuardianMoveAction[];
  /** Guardian position. */
  readonly player: VillageGuardianPosition;
  /** Current level villagers. */
  readonly villagers: readonly VillageGuardianVillager[];
  /** Current level rescued trail. */
  readonly trail: readonly VillageGuardianTrailSegment[];
  /** Deterministic active monsters. */
  readonly monsters: readonly VillageGuardianMonster[];
  /** Current sanctuary position. */
  readonly sanctuary: VillageGuardianSanctuary;
  /** Remaining lives. */
  readonly lives: number;
  /** Shared resource alias for remaining lives. */
  readonly energy: number;
  /** Remaining level time in milliseconds. */
  readonly remainingTimeMs: number;
  /** Starting level time in milliseconds. */
  readonly timeLimitMs: number;
  /** Elapsed level time in milliseconds. */
  readonly elapsedMs: number;
  /** Words currently represented by the trail. */
  readonly collectedWords: readonly string[];
  /** Number of correct villager collisions. */
  readonly correctAnswers: number;
  /** Number of villager collision attempts. */
  readonly totalAttempts: number;
  /** Current score. */
  readonly score: number;
  /** Most recent learning or hazard outcome. */
  readonly lastOutcome: VillageGuardianOutcome | undefined;
  /** Most recent visible gameplay event. */
  readonly lastEvent: VillageGuardianEvent | undefined;
  /** First terminal result, when the session has ended. */
  readonly result: GameResults | undefined;
  /** Whether cleanup sealed this session. */
  readonly destroyed: boolean;
}

/** Four-way movement action owned by Village Guardian. */
export type VillageGuardianMoveAction = (typeof VILLAGE_GUARDIAN_ACTIONS)[number];

/** One drawn D-pad button in scene pixels. */
export interface VillageGuardianDpadButton {
  /** Movement action this button dispatches. */
  readonly action: VillageGuardianMoveAction;
  /** Left edge of the drawn button. */
  readonly x: number;
  /** Top edge of the drawn button. */
  readonly y: number;
  /** Drawn button width. */
  readonly width: number;
  /** Drawn button height. */
  readonly height: number;
}

/** Result returned after movement or a monster hazard. */
export interface VillageGuardianActionResult {
  /** Whether the controller accepted the action. */
  readonly accepted: boolean;
  /** Whether the action rescued the ordered villager. */
  readonly correct: boolean;
  /** Whether the action changed learning or sanctuary progress. */
  readonly progressed: boolean;
  /** Whether the action produced a terminal state. */
  readonly terminal: boolean;
  /** Compatibility alias for terminal. */
  readonly completed: boolean;
  /** First terminal result, when produced by this action. */
  readonly result?: GameResults;
  /** State after processing the action. */
  readonly snapshot: VillageGuardianSnapshot;
}

/** Transport-independent rules and lifecycle controls for Village Guardian. */
export interface VillageGuardianController {
  /** Returns the current immutable state. */
  snapshot(): VillageGuardianSnapshot;
  /** Moves the guardian and resolves collisions. */
  choose(action: InputActionId): VillageGuardianActionResult;
  /** Advances timers and deterministic monster movement. */
  tick(deltaMs: number): VillageGuardianSnapshot;
  /** Applies one monster collision for deterministic hazard handling. */
  applyMonster(): VillageGuardianActionResult;
  /** Applies the same hazard behavior through the common controller name. */
  applyHazard(): VillageGuardianActionResult;
  /** Applies one safe tutorial learning demonstration. */
  demonstrate(correct: boolean): VillageGuardianActionResult;
  /** Captures state for responsive scene restoration. */
  capture(): VillageGuardianSnapshot;
  /** Restores validated state captured before a responsive reflow. */
  restore(snapshot: VillageGuardianSnapshot): void;
  /** Seals the session during scene cleanup. */
  destroy(): void;
}

interface VillageGuardianLevel {
  readonly level: number;
  readonly translation: string;
  readonly words: readonly string[];
  readonly startIndex: number;
}

interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}

interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

interface PhaserSceneLike {
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
    image?(x: number, y: number, key: string, frame?: number): ActorSpriteLike;
    sprite?(x: number, y: number, key: string, frame?: number): ActorSpriteLike;
    tileSprite?(x: number, y: number, width: number, height: number, key: string): ActorSpriteLike;
  };
  load?: {
    image?(key: string, url: string): unknown;
    spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
    audio?(key: string, urls: string | string[]): unknown;
  };
  events?: { once(event: string, listener: () => void): void };
  game?: { readonly canvas?: { getBoundingClientRect?(): { readonly left: number; readonly top?: number; readonly width: number; readonly height?: number } } };
  scale?: { readonly width?: number; readonly height?: number };
}

interface SceneResources {
  readonly graphics: PhaserGraphicsLike;
  readonly art: ActorSpriteLayer;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly dpad: readonly PhaserTextLike[];
  readonly villagerLabels: Map<string, PhaserTextLike>;
}

interface VillageGuardianSceneContext {
  readonly controller: VillageGuardianController;
  readonly edition: RuntimeEdition;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
}

const START_POSITION = Object.freeze({ x: 100, y: 120 });
const SANCTUARY = Object.freeze({ x: 700, y: 408, radius: 34 });
const PLAYER_RADIUS = 16;
const VILLAGER_RADIUS = 17;
const MONSTER_RADIUS = 22;
const TUTORIAL_WRONG_VILLAGER_ID = "tutorial-wrong-villager";
const TUTORIAL_WRONG_VILLAGER_ORDER_INDEX = -1;
const ARENA_BOUNDS = Object.freeze({ left: 60, right: 740, top: 72, bottom: 432 });
const DPAD_ORIGIN_INSET = Object.freeze({ x: 110, y: 102 });
const DPAD_BUTTON_SIZE = 50;
const DPAD_BUTTON_OFFSET = 52;
const DPAD_BUTTON_RADIUS = 12;
const VILLAGER_LAYOUT = Object.freeze([
  Object.freeze({ x: 220, y: 120 }),
  Object.freeze({ x: 340, y: 120 }),
  Object.freeze({ x: 220, y: 240 }),
  Object.freeze({ x: 460, y: 240 }),
  Object.freeze({ x: 340, y: 336 }),
  Object.freeze({ x: 580, y: 336 }),
  Object.freeze({ x: 220, y: 336 }),
  Object.freeze({ x: 580, y: 120 }),
  Object.freeze({ x: 100, y: 240 }),
  Object.freeze({ x: 700, y: 240 }),
]);

function clonePosition(position: VillageGuardianPosition): VillageGuardianPosition {
  return { x: position.x, y: position.y };
}

function distanceBetween(first: VillageGuardianPosition, second: VillageGuardianPosition): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
  return value;
}

function finiteNonnegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and nonnegative`);
  return value;
}

function tokenize(term: string, index: number): readonly string[] {
  const words = term.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) throw new Error(`Nonempty content entry ${index} has a blank term`);
  return Object.freeze(words);
}

function buildLevels(input: unknown): readonly VillageGuardianLevel[] {
  const parsed = sentenceInputSchema.parse(input);
  if (parsed.length === 0) throw new Error("Village Guardian content cannot be empty");
  let startIndex = 0;
  const levels = parsed.map((item, index) => {
    const words = tokenize(item.term, index);
    const level: VillageGuardianLevel = Object.freeze({
      level: index + 1,
      translation: item.translation,
      words,
      startIndex,
    });
    startIndex += words.length;
    return level;
  });
  return Object.freeze(levels);
}

function totalWordCount(levels: readonly VillageGuardianLevel[]): number {
  return levels.reduce((total, level) => total + level.words.length, 0);
}

function finiteSeed(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(Math.trunc(value)) % 2_147_483_647;
}

function hashUnit(seed: number, level: number, index: number, salt: number): number {
  let value = (finiteSeed(seed) + level * 48_271 + index * 12_289 + salt * 7_919) % 2_147_483_647;
  value = (value * 48_271) % 2_147_483_647;
  return value / 2_147_483_647;
}

function positionForWord(
  level: number,
  index: number,
  wordCount: number,
  seed: number,
  variant = 0,
): VillageGuardianPosition {
  const layout = VILLAGER_LAYOUT[index % VILLAGER_LAYOUT.length]!;
  const extraRows = Math.floor(index / VILLAGER_LAYOUT.length);
  const jitterX = (hashUnit(seed, level, index, 11 + variant) - 0.5) * Math.min(34, 120 / Math.max(1, wordCount));
  const jitterY = (hashUnit(seed, level, index, 23 + variant) - 0.5) * Math.min(30, 120 / Math.max(1, wordCount));
  return {
    x: clamp(layout.x + (extraRows % 2) * 24 + jitterX, ARENA_BOUNDS.left, ARENA_BOUNDS.right),
    y: clamp(layout.y + extraRows * 24 + jitterY, ARENA_BOUNDS.top, ARENA_BOUNDS.bottom),
  };
}

function createVillagers(level: VillageGuardianLevel, seed: number, variant = 0): VillageGuardianVillager[] {
  return level.words.map((word, index) => {
    const position = positionForWord(level.level, index, level.words.length, seed, variant);
    return {
      id: `villager-${level.level}-${index}`,
      level: level.level,
      orderIndex: index,
      word,
      ...position,
      collected: false,
      hiding: false,
      hiddenUntilMs: 0,
    };
  });
}

function tutorialWrongVillagerPosition(
  level: VillageGuardianLevel,
  player: VillageGuardianPosition,
  seed: number,
): VillageGuardianPosition {
  const horizontalDirection = hashUnit(seed, level.level, level.words.length, 101) >= 0.5 ? 1 : -1;
  const horizontalX = clamp(player.x + horizontalDirection * VILLAGE_GUARDIAN_MOVE_STEP, ARENA_BOUNDS.left, ARENA_BOUNDS.right);
  if (horizontalX !== player.x) return { x: horizontalX, y: player.y };
  const verticalDirection = hashUnit(seed, level.level, level.words.length, 103) >= 0.5 ? 1 : -1;
  return {
    x: player.x,
    y: clamp(player.y + verticalDirection * VILLAGE_GUARDIAN_MOVE_STEP, ARENA_BOUNDS.top, ARENA_BOUNDS.bottom),
  };
}

function tutorialWrongWord(
  levels: readonly VillageGuardianLevel[],
  current: VillageGuardianLevel,
): string {
  const allWords = levels.flatMap((level) => [...level.words]);
  if (allWords.length === 0) return current.words[0] ?? "";
  return allWords[(current.startIndex + 1) % allWords.length]!;
}

function createTutorialWrongVillager(
  level: VillageGuardianLevel,
  player: VillageGuardianPosition,
  seed: number,
  word: string,
): VillageGuardianVillager {
  return {
    id: TUTORIAL_WRONG_VILLAGER_ID,
    level: level.level,
    orderIndex: TUTORIAL_WRONG_VILLAGER_ORDER_INDEX,
    word,
    ...tutorialWrongVillagerPosition(level, player, seed),
    collected: false,
    hiding: false,
    hiddenUntilMs: 0,
  };
}

function createMonsters(level: number, seed: number): VillageGuardianMonster[] {
  const horizontal = hashUnit(seed, level, 0, 31);
  const vertical = hashUnit(seed, level, 0, 37);
  const direction = hashUnit(seed, level, 0, 41) >= 0.5 ? 1 : -1;
  return [{
    id: `monster-${level}`,
    x: 540 + horizontal * 170,
    y: 72 + vertical * 74,
    velocityX: direction * (0.018 + hashUnit(seed, level, 0, 43) * 0.014),
    velocityY: (hashUnit(seed, level, 0, 47) - 0.5) * 0.04,
  }];
}

function actionForTarget(player: VillageGuardianPosition, target: VillageGuardianPosition): VillageGuardianMoveAction {
  const horizontal = target.x - player.x;
  const vertical = target.y - player.y;
  if (Math.abs(horizontal) >= Math.abs(vertical) && horizontal !== 0) {
    return horizontal > 0 ? "move-right" : "move-left";
  }
  return vertical >= 0 ? "move-down" : "move-up";
}

function snapshotTargetVillager(
  phase: VillageGuardianPhase,
  currentVillagers: readonly VillageGuardianVillager[],
  nextLevelTargetIndex: number,
  wordCount: number,
): VillageGuardianVillager | undefined {
  if (phase === "victory") return undefined;
  return currentVillagers.find((villager) => villager.orderIndex === nextLevelTargetIndex && !villager.collected)
    ?? currentVillagers[clamp(nextLevelTargetIndex, 0, Math.max(0, wordCount - 1))];
}

function snapshotCorrectAction(
  phase: VillageGuardianPhase,
  player: VillageGuardianPosition,
  currentVillagers: readonly VillageGuardianVillager[],
  nextLevelTargetIndex: number,
  wordCount: number,
): VillageGuardianMoveAction {
  const target = snapshotTargetVillager(phase, currentVillagers, nextLevelTargetIndex, wordCount);
  return target ? actionForTarget(player, target) : "move-down";
}

function actionResult(
  snapshot: VillageGuardianSnapshot,
  values: Omit<VillageGuardianActionResult, "snapshot">,
): VillageGuardianActionResult {
  return Object.freeze({ ...values, snapshot });
}

function buildResult(accountant: ReturnType<typeof createResultAccountant>): GameResults {
  return gameResultsSchema.parse(finalizeResult(accountant, {
    xpPerCorrect: 10,
    xpPerAccuracyPoint: 10,
  }));
}

/** Returns the four drawn D-pad buttons for the current scene size.
 * @param sceneWidth Current scene width.
 * @param sceneHeight Current scene height.
 * @returns Frozen button rectangles that match the on-screen D-pad.
 */
export function getVillageGuardianDpadLayout(
  sceneWidth: number,
  sceneHeight: number,
): readonly VillageGuardianDpadButton[] {
  const centerX = sceneWidth - DPAD_ORIGIN_INSET.x;
  const centerY = sceneHeight - DPAD_ORIGIN_INSET.y;
  const half = DPAD_BUTTON_SIZE / 2;
  return Object.freeze(([
    { action: "move-left", cx: centerX - DPAD_BUTTON_OFFSET, cy: centerY },
    { action: "move-right", cx: centerX + DPAD_BUTTON_OFFSET, cy: centerY },
    { action: "move-up", cx: centerX, cy: centerY - DPAD_BUTTON_OFFSET },
    { action: "move-down", cx: centerX, cy: centerY + DPAD_BUTTON_OFFSET },
  ] as const).map((button) => Object.freeze({
    action: button.action,
    x: button.cx - half,
    y: button.cy - half,
    width: DPAD_BUTTON_SIZE,
    height: DPAD_BUTTON_SIZE,
  })));
}

/** Maps a pointer hit on a drawn D-pad button to that button's movement action.
 * @param pointerX Scene-space horizontal pointer position.
 * @param pointerY Scene-space vertical pointer position.
 * @param sceneWidth Current scene width.
 * @param sceneHeight Current scene height.
 * @returns The hit button's action, or undefined when the pointer is off the D-pad.
 */
export function chooseVillageGuardianDirectionFromPointer(
  pointerX: number,
  pointerY: number,
  sceneWidth: number,
  sceneHeight: number,
): VillageGuardianMoveAction | undefined {
  return getVillageGuardianDpadLayout(sceneWidth, sceneHeight).find((button) => (
    pointerX >= button.x
    && pointerX <= button.x + button.width
    && pointerY >= button.y
    && pointerY <= button.y + button.height
  ))?.action;
}

/** Creates deterministic Village Guardian rules for one sentence session.
 * @param input Untrusted sentence content for the rescue session.
 * @param deliver Callback for the first terminal result.
 * @param options Optional deterministic session settings.
 * @returns A transport-independent Village Guardian controller.
 * @throws When content or session settings are invalid.
 */
export function createVillageGuardianController(
  input: unknown,
  deliver: (result: GameResults, outcome: GameTerminalOutcome) => void | Promise<void>,
  options: VillageGuardianOptions = {},
): VillageGuardianController {
  const levels = buildLevels(input);
  const targetCount = totalWordCount(levels);
  const seed = finiteSeed(options.seed ?? 0);
  const tutorialOnly = options.tutorialOnly === true;
  const timeLimitMs = positiveInteger(options.timeLimitMs ?? VILLAGE_GUARDIAN_TIME_LIMIT_MS, "Village Guardian time limit");
  const wrongTimePenaltyMs = finiteNonnegative(
    options.wrongTimePenaltyMs ?? VILLAGE_GUARDIAN_WRONG_TIME_PENALTY_MS,
    "Village Guardian wrong-villager penalty",
  );
  const startingLives = positiveInteger(options.initialLives ?? VILLAGE_GUARDIAN_INITIAL_LIVES, "Village Guardian lives");
  let terminalOutcome: GameTerminalOutcome = "complete";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));
  let accountant = createResultAccountant();
  let phase: VillageGuardianPhase = "playing";
  let levelIndex = 0;
  let targetIndex = 0;
  let player = clonePosition(START_POSITION);
  let villagers = createVillagers(levels[0]!, seed);
  let trail: VillageGuardianTrailSegment[] = [];
  let monsters = createMonsters(1, seed);
  let lives = startingLives;
  let remainingTimeMs = timeLimitMs;
  let elapsedMs = 0;
  let lastOutcome: VillageGuardianOutcome | undefined;
  let lastEvent: VillageGuardianEvent | undefined;
  let terminalResultValue: GameResults | undefined;
  let destroyed = false;

  const currentLevel = (): VillageGuardianLevel => levels[levelIndex]!;
  const levelTargetIndex = (): number => targetIndex - currentLevel().startIndex;
  const currentVillager = (): VillageGuardianVillager | undefined => villagers.find(
    (villager) => villager.orderIndex === levelTargetIndex() && !villager.collected,
  );

  const snapshot = (): VillageGuardianSnapshot => {
    const level = currentLevel();
    const displayWordIndex = phase === "victory"
      ? level.words.length - 1
      : clamp(levelTargetIndex(), 0, level.words.length - 1);
    const target = snapshotTargetVillager(phase, villagers, levelTargetIndex(), level.words.length);
    const answer = phase === "victory"
      ? level.words[displayWordIndex]!
      : target?.word ?? level.words[displayWordIndex]!;
    return Object.freeze({
      seed,
      phase,
      mechanic: "ordered-villager-trail",
      level: level.level,
      levelCount: levels.length,
      targetIndex,
      targetCount,
      levelTargetIndex: clamp(levelTargetIndex(), 0, level.words.length),
      prompt: level.translation,
      answer,
      correctAction: snapshotCorrectAction(phase, player, villagers, levelTargetIndex(), level.words.length),
      availableActions: VILLAGE_GUARDIAN_ACTIONS,
      player: Object.freeze(clonePosition(player)),
      villagers: Object.freeze(villagers.map((villager) => Object.freeze({ ...villager }))),
      trail: Object.freeze(trail.map((segment) => Object.freeze({ ...segment }))),
      monsters: Object.freeze(monsters.map((monster) => Object.freeze({ ...monster }))),
      sanctuary: Object.freeze({ ...SANCTUARY }),
      lives,
      energy: lives,
      remainingTimeMs,
      timeLimitMs,
      elapsedMs,
      collectedWords: Object.freeze(trail.map((segment) => segment.word)),
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      lastOutcome,
      lastEvent,
      result: terminalResultValue,
      destroyed,
    });
  };

  const finish = (nextPhase: Exclude<VillageGuardianPhase, "playing">, event: VillageGuardianEvent): GameResults => {
    phase = nextPhase;
    terminalOutcome = nextPhase === "victory" ? "victory" : "defeat";
    lastEvent = event;
    if (event === "timer-expired") remainingTimeMs = 0;
    terminalResultValue = buildResult(accountant);
    completion.complete(terminalResultValue);
    return terminalResultValue;
  };

  const enterDefeat = (event: "timer-expired" | "monster-hit-guardian"): GameResults => {
    return finish("defeat", event);
  };

  const restoreVillager = (segment: VillageGuardianTrailSegment): void => {
    const villagerId = segment.id.replace(/^trail-/u, "");
    villagers = villagers.map((villager) => villager.id === villagerId
      ? {
        ...villager,
        ...positionForWord(villager.level, villager.orderIndex, currentLevel().words.length, seed, 67),
        collected: false,
        hiding: false,
        hiddenUntilMs: 0,
      }
      : villager);
  };

  const disruptTrailFrom = (index: number): void => {
    const removed = trail.slice(index);
    for (const segment of removed) restoreVillager(segment);
    trail = trail.slice(0, index);
    targetIndex = currentLevel().startIndex + trail.length;
  };

  const resetVillagerTrail = (): void => {
    trail = [];
    targetIndex = currentLevel().startIndex;
    villagers = villagers.map((villager) => villager.collected
      ? {
        ...villager,
        ...positionForWord(villager.level, villager.orderIndex, currentLevel().words.length, seed, 73),
        collected: false,
      }
      : villager);
  };

  const applyWrongVillager = (villager: VillageGuardianVillager): VillageGuardianActionResult => {
    accountant.recordAttempt({ correct: false });
    lastOutcome = "incorrect";
    lastEvent = "wrong-villager";
    resetVillagerTrail();
    const hiddenUntilMs = elapsedMs + VILLAGE_GUARDIAN_HIDE_DURATION_MS;
    villagers = villagers.map((candidate) => candidate.id === villager.id
      ? { ...candidate, hiding: true, hiddenUntilMs }
      : candidate);
    remainingTimeMs = Math.max(0, remainingTimeMs - wrongTimePenaltyMs);
    if (remainingTimeMs === 0) {
      const result = enterDefeat("timer-expired");
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: true,
        completed: true,
        result,
      });
    }
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
    });
  };

  const updateTrail = (): void => {
    let target: VillageGuardianPosition = player;
    trail = trail.map((segment) => {
      const deltaX = target.x - segment.x;
      const deltaY = target.y - segment.y;
      const segmentDistance = Math.hypot(deltaX, deltaY);
      const next = segmentDistance > VILLAGE_GUARDIAN_TRAIL_SPACING
        ? {
          ...segment,
          x: segment.x + deltaX * ((segmentDistance - VILLAGE_GUARDIAN_TRAIL_SPACING) / segmentDistance),
          y: segment.y + deltaY * ((segmentDistance - VILLAGE_GUARDIAN_TRAIL_SPACING) / segmentDistance),
        }
        : segment;
      target = next;
      return next;
    });
  };

  const levelAdvance = (): boolean => {
    if (trail.length !== currentLevel().words.length) return false;
    if (levelIndex + 1 < levels.length) {
      levelIndex += 1;
      targetIndex = currentLevel().startIndex;
      player = clonePosition(START_POSITION);
      villagers = createVillagers(currentLevel(), seed);
      trail = [];
      monsters = createMonsters(currentLevel().level, seed);
      remainingTimeMs = timeLimitMs;
      elapsedMs = 0;
      lastOutcome = "sanctuary";
      lastEvent = "sanctuary-reached";
      return true;
    }
    targetIndex = targetCount;
    lastOutcome = "sanctuary";
    finish("victory", "final-sanctuary");
    return true;
  };

  const collectVillager = (villager: VillageGuardianVillager): VillageGuardianActionResult => {
    accountant.recordAttempt({ correct: true });
    accountant.addScore(100);
    lastOutcome = "correct";
    lastEvent = "correct-villager";
    villagers = villagers.map((candidate) => candidate.id === villager.id
      ? { ...candidate, collected: true }
      : candidate);
    trail = [
      ...trail,
      {
        id: `trail-${villager.id}`,
        level: villager.level,
        orderIndex: villager.orderIndex,
        word: villager.word,
        x: player.x,
        y: player.y,
      },
    ];
    targetIndex += 1;
    const progressed = true;
    const terminal = phase !== "playing";
    return actionResult(snapshot(), {
      accepted: true,
      correct: true,
      progressed,
      terminal,
      completed: terminal,
      ...(terminal ? { result: terminalResultValue } : {}),
    });
  };

  const resolveVillagerCollision = (): VillageGuardianActionResult | undefined => {
    const villager = villagers.find((candidate) => !candidate.collected && !candidate.hiding
      && distanceBetween(player, candidate) <= PLAYER_RADIUS + VILLAGER_RADIUS);
    if (!villager) return undefined;

    const expected = levelTargetIndex();
    if (villager.orderIndex === expected) return collectVillager(villager);
    return applyWrongVillager(villager);
  };

  const resolveSanctuary = (): VillageGuardianActionResult | undefined => {
    if (phase !== "playing" || trail.length !== currentLevel().words.length) return undefined;
    if (distanceBetween(player, SANCTUARY) > PLAYER_RADIUS + SANCTUARY.radius) return undefined;
    const advanced = levelAdvance();
    const terminal = phase !== "playing";
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: advanced,
      terminal,
      completed: terminal,
      ...(terminal ? { result: terminalResultValue } : {}),
    });
  };

  const applyMonsterInternal = (
    disruptedIndex = trail.length - 1,
    resetEntireTrail = false,
  ): VillageGuardianActionResult => {
    if (destroyed || phase !== "playing") {
      return actionResult(snapshot(), {
        accepted: false,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }
    lastOutcome = "hazard";
    if (trail.length > 0) {
      if (resetEntireTrail) resetVillagerTrail();
      else disruptTrailFrom(clamp(Math.trunc(disruptedIndex), 0, trail.length - 1));
      lastEvent = "monster-disrupted-trail";
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }
    lives = Math.max(0, lives - 1);
    lastEvent = "monster-hit-guardian";
    if (lives === 0) {
      const result = enterDefeat("monster-hit-guardian");
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: true,
        completed: true,
        result,
      });
    }
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
    });
  };

  const move = (action: InputActionId): VillageGuardianActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing" || !VILLAGE_GUARDIAN_ACTIONS.includes(action as VillageGuardianMoveAction)) {
      return actionResult(before, {
        accepted: false,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }
    const initialVillagerResult = resolveVillagerCollision();
    if (initialVillagerResult) return initialVillagerResult;

    const moveAction = action as VillageGuardianMoveAction;
    const delta = {
      "move-left": { x: -VILLAGE_GUARDIAN_MOVE_STEP, y: 0 },
      "move-right": { x: VILLAGE_GUARDIAN_MOVE_STEP, y: 0 },
      "move-up": { x: 0, y: -VILLAGE_GUARDIAN_MOVE_STEP },
      "move-down": { x: 0, y: VILLAGE_GUARDIAN_MOVE_STEP },
    }[moveAction];
    player = {
      x: clamp(player.x + delta.x, ARENA_BOUNDS.left, ARENA_BOUNDS.right),
      y: clamp(player.y + delta.y, ARENA_BOUNDS.top, ARENA_BOUNDS.bottom),
    };
    updateTrail();

    const villagerResult = resolveVillagerCollision();
    if (villagerResult) return villagerResult;
    const sanctuaryResult = resolveSanctuary();
    if (sanctuaryResult) return sanctuaryResult;
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
    });
  };

  const validateRestoredState = (state: VillageGuardianSnapshot): void => {
    if (state === null || typeof state !== "object") throw new Error("Village Guardian state must be an object");
    if (state.phase !== "playing" && state.phase !== "victory" && state.phase !== "defeat") {
      throw new Error("Village Guardian state phase is invalid");
    }
    if (state.mechanic !== "ordered-villager-trail") throw new Error("Village Guardian mechanic is invalid");
    if (state.seed !== seed) throw new Error("Village Guardian state seed is invalid");
    if (state.levelCount !== levels.length || state.targetCount !== targetCount) {
      throw new Error("Village Guardian state content count is invalid");
    }
    if (!Number.isInteger(state.level) || state.level < 1 || state.level > levels.length) {
      throw new Error("Village Guardian state level is invalid");
    }
    const level = levels[state.level - 1]!;
    if (!Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > targetCount) {
      throw new Error("Village Guardian state target index is invalid");
    }
    const expectedLevelTargetIndex = state.phase === "victory"
      ? level.words.length
      : state.targetIndex - level.startIndex;
    if (!Number.isInteger(state.levelTargetIndex) || state.levelTargetIndex < 0
      || state.levelTargetIndex > level.words.length
      || state.levelTargetIndex !== expectedLevelTargetIndex
      || (state.phase === "victory" && state.targetIndex !== targetCount)
      || (state.phase !== "victory" && state.targetIndex !== level.startIndex + state.levelTargetIndex)) {
      throw new Error("Village Guardian state target index is invalid");
    }
    if (!Number.isInteger(state.lives) || state.lives < 0 || state.lives > startingLives) {
      throw new Error("Village Guardian state lives are invalid");
    }
    if (state.energy !== state.lives) throw new Error("Village Guardian state energy is invalid");
    if (state.timeLimitMs !== timeLimitMs || !Number.isFinite(state.remainingTimeMs)
      || state.remainingTimeMs < 0 || state.remainingTimeMs > timeLimitMs) {
      throw new Error("Village Guardian state timer is invalid");
    }
    if (!Number.isFinite(state.elapsedMs) || state.elapsedMs < 0 || typeof state.destroyed !== "boolean") {
      throw new Error("Village Guardian lifecycle state is invalid");
    }
    if (state.lastOutcome !== undefined
      && state.lastOutcome !== "correct" && state.lastOutcome !== "incorrect"
      && state.lastOutcome !== "hazard" && state.lastOutcome !== "sanctuary") {
      throw new Error("Village Guardian outcome state is invalid");
    }
    if (!Number.isInteger(state.correctAnswers) || !Number.isInteger(state.totalAttempts)
      || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts
      || state.score !== state.correctAnswers * 100) {
      throw new Error("Village Guardian result counters are invalid");
    }
    if (state.phase === "playing" && (state.lives === 0 || state.remainingTimeMs === 0)) {
      throw new Error("Village Guardian playing state is terminal");
    }
    if (state.phase === "victory" && state.level !== levels.length) {
      throw new Error("Village Guardian victory state has an invalid level");
    }
    const contentVillagers = Array.isArray(state.villagers)
      ? state.villagers.filter((villager) => villager.id !== TUTORIAL_WRONG_VILLAGER_ID)
      : [];
    const tutorialWrongVillagers = Array.isArray(state.villagers)
      ? state.villagers.filter((villager) => villager.id === TUTORIAL_WRONG_VILLAGER_ID)
      : [];
    if (!Array.isArray(state.villagers) || contentVillagers.length !== level.words.length
      || tutorialWrongVillagers.length > (tutorialOnly ? 1 : 0)
      || !Array.isArray(state.trail) || state.trail.length !== state.levelTargetIndex
      || !Array.isArray(state.monsters) || state.monsters.length !== 1) {
      throw new Error("Village Guardian state entities are invalid");
    }
    for (const villager of tutorialWrongVillagers) {
      if (villager.level !== level.level || villager.orderIndex !== TUTORIAL_WRONG_VILLAGER_ORDER_INDEX
        || villager.word !== tutorialWrongWord(levels, level) || villager.collected
        || !Number.isFinite(villager.x) || !Number.isFinite(villager.y)
        || villager.x < ARENA_BOUNDS.left || villager.x > ARENA_BOUNDS.right
        || villager.y < ARENA_BOUNDS.top || villager.y > ARENA_BOUNDS.bottom
        || !Number.isFinite(villager.hiddenUntilMs) || villager.hiddenUntilMs < 0
        || (villager.hiding && villager.hiddenUntilMs <= state.elapsedMs)) {
        throw new Error("Village Guardian tutorial villager state is inconsistent");
      }
    }
    if (state.sanctuary.x !== SANCTUARY.x || state.sanctuary.y !== SANCTUARY.y
      || state.sanctuary.radius !== SANCTUARY.radius) {
      throw new Error("Village Guardian sanctuary state is invalid");
    }
    if (!Number.isFinite(state.player.x) || !Number.isFinite(state.player.y)
      || state.player.x < ARENA_BOUNDS.left || state.player.x > ARENA_BOUNDS.right
      || state.player.y < ARENA_BOUNDS.top || state.player.y > ARENA_BOUNDS.bottom) {
      throw new Error("Village Guardian player state is invalid");
    }
    for (let index = 0; index < contentVillagers.length; index += 1) {
      const villager = contentVillagers[index]!;
      if (villager.id !== `villager-${level.level}-${index}` || villager.level !== level.level
        || villager.orderIndex !== index || villager.word !== level.words[index]
        || villager.collected !== (index < state.levelTargetIndex)
        || (villager.collected && villager.hiding)
        || !Number.isFinite(villager.x) || !Number.isFinite(villager.y)
        || villager.x < ARENA_BOUNDS.left || villager.x > ARENA_BOUNDS.right
        || villager.y < ARENA_BOUNDS.top || villager.y > ARENA_BOUNDS.bottom
        || !Number.isFinite(villager.hiddenUntilMs) || villager.hiddenUntilMs < 0
        || (villager.hiding && villager.hiddenUntilMs <= state.elapsedMs)) {
        throw new Error("Village Guardian villager state is inconsistent");
      }
    }
    for (let index = 0; index < state.trail.length; index += 1) {
      const segment = state.trail[index]!;
      const villager = contentVillagers[index]!;
      if (segment.id !== `trail-${villager.id}` || segment.level !== level.level
        || segment.orderIndex !== index || segment.word !== villager.word
        || !Number.isFinite(segment.x) || !Number.isFinite(segment.y)) {
        throw new Error("Village Guardian trail state is inconsistent");
      }
    }
    for (const monster of state.monsters) {
      if (monster.id !== `monster-${level.level}`
        || !Number.isFinite(monster.x) || !Number.isFinite(monster.y)
        || monster.x < ARENA_BOUNDS.left || monster.x > ARENA_BOUNDS.right
        || monster.y < ARENA_BOUNDS.top || monster.y > ARENA_BOUNDS.bottom
        || !Number.isFinite(monster.velocityX) || !Number.isFinite(monster.velocityY)) {
        throw new Error("Village Guardian monster state is inconsistent");
      }
    }
    if (state.correctAction !== snapshotCorrectAction(
      state.phase,
      state.player,
      state.villagers,
      state.levelTargetIndex,
      level.words.length,
    )
      || state.availableActions.join(",") !== VILLAGE_GUARDIAN_ACTIONS.join(",")
      || state.collectedWords.join("|") !== state.trail.map((segment) => segment.word).join("|")) {
      throw new Error("Village Guardian action state is inconsistent");
    }
    if (String(state.phase) === "complete") {
      throw new Error("Village Guardian state phase is invalid");
    }
    if (state.phase === "victory" && state.targetIndex !== targetCount) {
      throw new Error("Village Guardian victory state has unfinished words");
    }
    if (state.phase === "defeat" && state.lives !== 0 && state.remainingTimeMs > 0) {
      throw new Error("Village Guardian defeat state is not terminal");
    }
    if (state.phase === "playing" && state.result !== undefined) {
      throw new Error("Village Guardian active state has a terminal result");
    }
    if (state.phase !== "playing") {
      if (state.result === undefined) throw new Error("Village Guardian terminal state has no result");
      gameResultsSchema.parse(state.result);
    }
  };

  const restore = (state: VillageGuardianSnapshot): void => {
    if (destroyed) return;
    validateRestoredState(state);
    phase = state.phase;
    levelIndex = state.level - 1;
    targetIndex = state.targetIndex;
    player = clonePosition(state.player);
    villagers = state.villagers.map((villager) => ({ ...villager }));
    trail = state.trail.map((segment) => ({ ...segment }));
    monsters = state.monsters.map((monster) => ({ ...monster }));
    lives = state.lives;
    remainingTimeMs = state.remainingTimeMs;
    elapsedMs = state.elapsedMs;
    lastOutcome = state.lastOutcome;
    lastEvent = state.lastEvent;
    terminalResultValue = state.result;
    destroyed = state.destroyed;
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
    if (state.phase !== "playing" || state.destroyed) completion.sealWithoutDelivery();
  };

  const tick = (deltaMs: number): VillageGuardianSnapshot => {
    finiteNonnegative(deltaMs, "Village Guardian frame delta");
    if (destroyed || phase !== "playing") return snapshot();
    elapsedMs += deltaMs;
    remainingTimeMs = Math.max(0, remainingTimeMs - deltaMs);
    villagers = villagers.map((villager) => villager.hiding && villager.hiddenUntilMs <= elapsedMs
      ? {
        ...villager,
        ...(villager.id === TUTORIAL_WRONG_VILLAGER_ID
          ? tutorialWrongVillagerPosition(currentLevel(), player, seed)
          : positionForWord(villager.level, villager.orderIndex, currentLevel().words.length, seed, 89)),
        hiding: false,
        hiddenUntilMs: 0,
      }
      : villager);
    updateTrail();
    monsters = monsters.map((monster) => {
      let x = monster.x + monster.velocityX * deltaMs;
      let y = monster.y + monster.velocityY * deltaMs;
      let velocityX = monster.velocityX;
      let velocityY = monster.velocityY;
      if (x < ARENA_BOUNDS.left || x > ARENA_BOUNDS.right) {
        velocityX = -velocityX;
        x = clamp(x, ARENA_BOUNDS.left, ARENA_BOUNDS.right);
      }
      if (y < ARENA_BOUNDS.top || y > ARENA_BOUNDS.bottom) {
        velocityY = -velocityY;
        y = clamp(y, ARENA_BOUNDS.top, ARENA_BOUNDS.bottom);
      }
      return { ...monster, x, y, velocityX, velocityY };
    });
    if (remainingTimeMs === 0) {
      enterDefeat("timer-expired");
      return snapshot();
    }
    if (monsters.some((monster) => distanceBetween(monster, player) <= MONSTER_RADIUS + PLAYER_RADIUS)) {
      applyMonsterInternal(undefined, true);
    } else {
      const trailHitIndex = trail.findIndex((segment) => monsters.some(
        (monster) => distanceBetween(monster, segment) <= MONSTER_RADIUS,
      ));
      if (trailHitIndex >= 0) applyMonsterInternal(trailHitIndex);
    }
    return snapshot();
  };

  const demonstrate = (correct: boolean): VillageGuardianActionResult => {
    if (destroyed || phase !== "playing") {
      return actionResult(snapshot(), {
        accepted: false,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }
    if (!correct) {
      const wrongVillager = villagers.find((villager) => !villager.collected
        && !villager.hiding
        && villager.orderIndex !== levelTargetIndex());
      if (wrongVillager) return applyWrongVillager(wrongVillager);
      if (tutorialOnly) {
        const existingTutorialWrong = villagers.find((villager) => villager.id === TUTORIAL_WRONG_VILLAGER_ID);
        const tutorialWrong = existingTutorialWrong
          ? {
            ...existingTutorialWrong,
            ...tutorialWrongVillagerPosition(currentLevel(), player, seed),
            hiding: false,
            hiddenUntilMs: 0,
          }
          : createTutorialWrongVillager(
            currentLevel(),
            player,
            seed,
            tutorialWrongWord(levels, currentLevel()),
          );
        villagers = existingTutorialWrong
          ? villagers.map((villager) => villager.id === TUTORIAL_WRONG_VILLAGER_ID ? tutorialWrong : villager)
          : [tutorialWrong, ...villagers];
        return move(actionForTarget(player, tutorialWrong));
      }
      return actionResult(snapshot(), {
        accepted: false,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }
    let target = currentVillager();
    if (!target) {
      const hiddenTarget = villagers.find((villager) => villager.orderIndex === levelTargetIndex()
        && !villager.collected
        && villager.hiding);
      if (hiddenTarget) {
        villagers = villagers.map((villager) => villager.id === hiddenTarget.id
          ? { ...villager, hiding: false, hiddenUntilMs: 0 }
          : villager);
        target = { ...hiddenTarget, hiding: false, hiddenUntilMs: 0 };
      }
    }
    if (!target) {
      return actionResult(snapshot(), {
        accepted: false,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    }
    player = clonePosition(target);
    return collectVillager(target);
  };

  return Object.freeze({
    snapshot,
    choose: move,
    tick,
    applyMonster: applyMonsterInternal,
    applyHazard: applyMonsterInternal,
    demonstrate,
    capture: snapshot,
    restore,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

function sceneDimensions(scene: PhaserSceneLike): { width: number; height: number } {
  return {
    width: scene.scale?.width ?? VILLAGE_GUARDIAN_CANVAS.width,
    height: scene.scale?.height ?? VILLAGE_GUARDIAN_CANVAS.height,
  };
}

function pointerPosition(
  scene: PhaserSceneLike,
  pointerX: number,
  pointerY: number,
  dimensions: Readonly<{ width: number; height: number }>,
): VillageGuardianPosition {
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0) return { x: pointerX, y: pointerY };
  return {
    x: (pointerX - rect.left) * (dimensions.width / rect.width),
    y: (pointerY - (rect.top ?? 0)) * (dimensions.height / (rect.height ?? VILLAGE_GUARDIAN_CANVAS.height)),
  };
}

function createVillageGuardianScene(context: VillageGuardianSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let animationMs = 0;
  let cleaned = false;
  const normalize = createInputActionNormalizer({
    keyboard: VILLAGE_GUARDIAN_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
    pointerDrag: {
      leftAction: "move-left",
      rightAction: "move-right",
      upAction: "move-up",
      downAction: "move-down",
      threshold: 24,
    },
  });
  const scheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2_000;
  });

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const activeResources = resources;
    const { width, height } = sceneDimensions(scene);
    const state = context.controller.snapshot();
    const scaleX = width / VILLAGE_GUARDIAN_CANVAS.width;
    const scaleY = height / VILLAGE_GUARDIAN_CANVAS.height;
    const renderPosition = (position: VillageGuardianPosition): VillageGuardianPosition => ({
      x: position.x * scaleX,
      y: position.y * scaleY,
    });
    const pulse = 0.84 + Math.sin(animationMs / 320) * 0.12;
    const dpadButtons = getVillageGuardianDpadLayout(width, height);
    const dpadLabels: Record<VillageGuardianMoveAction, string> = {
      "move-left": "←",
      "move-right": "→",
      "move-up": "↑",
      "move-down": "↓",
    };

    activeResources.graphics.clear();
    const hasGround = activeResources.art.ground("world:ground", width, height);
    if (!hasGround) activeResources.graphics.fillStyle(0x071b2d, 1).fillRect(0, 0, width, height);
    activeResources.graphics.fillStyle(0x123d37, 1).fillRoundedRect(24, 72, width * 0.76, height * 0.75, 22);
    activeResources.graphics.lineStyle(2, 0x2dd4bf, 0.35).strokeRoundedRect(24, 72, width * 0.76, height * 0.75, 22);

    const sanctuary = renderPosition(state.sanctuary);
    activeResources.graphics.fillStyle(0x22c55e, 0.24).fillCircle(sanctuary.x, sanctuary.y, state.sanctuary.radius * Math.min(scaleX, scaleY));
    activeResources.graphics.lineStyle(3, 0x86efac, 0.9).strokeRoundedRect(
      sanctuary.x - 32 * scaleX,
      sanctuary.y - 32 * scaleY,
      64 * scaleX,
      64 * scaleY,
      12,
    );

    for (const segment of state.trail) {
      const position = renderPosition(segment);
      activeResources.graphics.fillStyle(0xfacc15, 0.82).fillCircle(position.x, position.y, 15 * Math.min(scaleX, scaleY));
    }
    for (const villager of state.villagers) {
      if (villager.collected) continue;
      const position = renderPosition(villager);
      const color = villager.hiding ? 0x64748b : villager.orderIndex === state.levelTargetIndex ? 0xf59e0b : 0x60a5fa;
      activeResources.graphics.fillStyle(color, villager.hiding ? 0.42 : pulse).fillCircle(
        position.x,
        position.y,
        VILLAGER_RADIUS * Math.min(scaleX, scaleY),
      );
      let label = activeResources.villagerLabels.get(villager.id);
      if (!label) {
        label = scene.add?.text(0, 0, villager.word, {
          fontFamily: "Arial",
          color: "#ffffff",
          fontSize: "14px",
          align: "center",
          wordWrap: { width: 72 },
        });
        if (label) activeResources.villagerLabels.set(villager.id, label);
      }
      label?.setText(villager.word).setPosition(position.x - 32 * scaleX, position.y - 34 * scaleY);
    }
    const visibleVillagerIds = new Set(state.villagers.filter((villager) => !villager.collected).map((villager) => villager.id));
    for (const [id, label] of activeResources.villagerLabels) {
      if (visibleVillagerIds.has(id)) continue;
      label.destroy();
      activeResources.villagerLabels.delete(id);
    }
    const artScale = Math.min(scaleX, scaleY);
    state.monsters.forEach((monster, index) => {
      const position = renderPosition(monster);
      const drawn = activeResources.art.place(`monster:${index}`, "enemy:idle", {
        x: position.x,
        y: position.y,
        width: MONSTER_RADIUS * 2.6 * artScale,
        depth: 7,
      });
      if (!drawn) {
        activeResources.graphics.fillStyle(0xef4444, 0.9).fillCircle(position.x, position.y, MONSTER_RADIUS * artScale);
      }
    });
    const player = renderPosition(state.player);
    const playerDrawn = activeResources.art.place("player", "player:idle", {
      x: player.x,
      y: player.y,
      width: PLAYER_RADIUS * 2.8 * artScale,
      depth: 8,
    });
    if (!playerDrawn) {
      activeResources.graphics.fillStyle(0xfde047, 1).fillCircle(player.x, player.y, PLAYER_RADIUS * artScale);
      activeResources.graphics.lineStyle(3, 0xfef08a, 0.9).strokeRoundedRect(player.x - 14, player.y - 14, 28, 28, 8);
    }
    activeResources.art.sweep();

    dpadButtons.forEach((button, index) => {
      activeResources.graphics.fillStyle(0x1e293b, 0.95).fillRoundedRect(
        button.x,
        button.y,
        button.width,
        button.height,
        DPAD_BUTTON_RADIUS,
      );
      activeResources.graphics.lineStyle(2, 0x94a3b8, 0.85).strokeRoundedRect(
        button.x,
        button.y,
        button.width,
        button.height,
        DPAD_BUTTON_RADIUS,
      );
      activeResources.dpad[index]?.setText(dpadLabels[button.action]).setPosition(
        button.x + button.width / 2 - 11,
        button.y + button.height / 2 - 16,
      );
    });

    activeResources.title.setText("VILLAGE GUARDIAN").setPosition(28, 18);
    activeResources.prompt.setText(`Rescue in order: ${state.prompt}`).setPosition(28, 52);
    activeResources.progress.setText(
      `${composition?.profile === "compact" ? "Compact" : "Wide"}  |  Level ${state.level}/${state.levelCount}  |  Word ${Math.min(state.levelTargetIndex + 1, currentLevelWordCount(state))}/${currentLevelWordCount(state)}  |  Lives ${state.lives}  |  Time ${Math.ceil(state.remainingTimeMs / 1_000)}s`,
    ).setPosition(28, 86);
    activeResources.feedback.setText(
      state.phase === "victory"
        ? "Every villager reached sanctuary!"
          : state.phase === "defeat"
            ? "The village needs another guardian."
            : state.lastEvent === "wrong-villager"
            ? "That villager hides. Rebuild the trail from the first word."
            : state.lastEvent === "monster-disrupted-trail"
              ? "A monster scattered the last villager."
              : "Guide the glowing villager, then bring the full trail to sanctuary.",
    ).setPosition(28, height - 58);
    activeResources.instructions.setText("Keyboard: arrows / WASD  •  Touch or click the D-pad").setPosition(28, height - 30);
  };

  const applyMove = (action: VillageGuardianMoveAction): void => {
    const result = context.controller.choose(action);
    if (!result.accepted) return;
    context.diagnostic({
      level: "info",
      code: result.terminal ? "VILLAGE_GUARDIAN_TERMINAL" : "VILLAGE_GUARDIAN_MOVE",
      message: result.terminal ? "Village Guardian reached a terminal state." : "Village Guardian processed movement.",
      details: { correct: result.correct, level: result.snapshot.level, targetIndex: result.snapshot.targetIndex },
    });
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    scheduler.cancel();
    context.inputController.cancelActiveGesture();
    context.controller.destroy();
    if (!resources) return;
    const activeResources = resources;
    resources = undefined;
    activeResources.graphics.destroy();
    activeResources.title.destroy();
    activeResources.prompt.destroy();
    activeResources.progress.destroy();
    activeResources.feedback.destroy();
    activeResources.instructions.destroy();
    for (const text of activeResources.dpad) text.destroy();
    for (const label of activeResources.villagerLabels.values()) label.destroy();
    activeResources.villagerLabels.clear();
    activeResources.art.destroy();
  };

  const artKeys = ["world:ground", "player:idle", "enemy:idle"] as const;

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load) return;
    preloadAssetBindings(
      this.load,
      context.edition,
      artKeys.filter((key) => context.edition.bindings[key]),
    );
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Village Guardian requires Phaser display services");
    const textWidth = Math.max(220, (context.composition?.safeRect?.width ?? VILLAGE_GUARDIAN_CANVAS.width) - 56);
    const textStyle = { fontFamily: "Arial", color: "#ffffff", fontSize: "18px", wordWrap: { width: textWidth } };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(0, 0, "", { ...textStyle, fontSize: "28px", fontStyle: "bold" }),
      prompt: this.add.text(0, 0, "", { ...textStyle, fontSize: "21px" }),
      progress: this.add.text(0, 0, "", { ...textStyle, fontSize: "16px", color: "#d1fae5" }),
      feedback: this.add.text(0, 0, "", { ...textStyle, fontSize: "16px", color: "#fde68a" }),
      instructions: this.add.text(0, 0, "", { ...textStyle, fontSize: "14px", color: "#cbd5e1" }),
      dpad: [
        this.add.text(0, 0, "", { ...textStyle, fontSize: "28px" }),
        this.add.text(0, 0, "", { ...textStyle, fontSize: "28px" }),
        this.add.text(0, 0, "", { ...textStyle, fontSize: "28px" }),
        this.add.text(0, 0, "", { ...textStyle, fontSize: "28px" }),
      ],
      villagerLabels: new Map(),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources || cleaned) return;
    scheduler.tick(delta);
    if (context.sessionMode === "playing") {
      context.controller.tick(scheduler.lastDeltaMs);
      const input = context.inputController.snapshot();
      const keyboardCodes = new Set([...(input.pressed ?? []), ...input.keys]);
      for (const code of keyboardCodes) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action && VILLAGE_GUARDIAN_ACTIONS.includes(action as VillageGuardianMoveAction)) {
          applyMove(action as VillageGuardianMoveAction);
        }
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const dimensions = sceneDimensions(this);
        const pointer = pointerPosition(this, input.pointer.x, input.pointer.y, dimensions);
        const pointerAction = chooseVillageGuardianDirectionFromPointer(
          pointer.x,
          pointer.y,
          dimensions.width,
          dimensions.height,
        );
        const tap = normalize({ modality: "pointer", phase: "up", x: pointer.x, y: pointer.y });
        if (
          tap.some(({ action }) => action === "confirm")
          && pointerAction
          && VILLAGE_GUARDIAN_ACTIONS.includes(pointerAction)
        ) {
          applyMove(pointerAction);
        }
      }
    }
    updateView(this);
  };

  return {
    key: VILLAGE_GUARDIAN_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown): void => {
        if (typeof state !== "object" || state === null) throw new Error("Village Guardian responsive state is invalid");
        context.controller.restore(state as VillageGuardianSnapshot);
      },
      apkRecompose: (nextComposition: VillageGuardianSceneContext["composition"]): void => {
        composition = nextComposition;
      },
    },
  };
}

function currentLevelWordCount(snapshot: VillageGuardianSnapshot): number {
  return snapshot.villagers.length;
}

/** Creates the standard Village Guardian cartridge and Phaser scene.
 * @returns A sentence-mode cartridge with the rescue controller and scene.
 */
export function createVillageGuardianCartridge(): StandardExperienceCartridge {
  let activeController: VillageGuardianController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: VILLAGE_GUARDIAN_ID,
    title: "Village Guardian",
    description: "Guide ordered villagers through danger and into sanctuary.",
    inputMode: "sentence",
    objective: "Rescue each sentence word in order, keep the trail together, and reach sanctuary.",
    mechanicInstruction: "Move in four directions to touch the glowing villager, then escort the full trail to sanctuary.",
    keyboardKeys: ["W", "A", "S", "D", "Arrow keys"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      controller.demonstrate(actionId === "action:select-correct");
    },
  });

  return {
    manifest: {
      id: VILLAGE_GUARDIAN_ID,
      title: "Village Guardian",
      description: "Guide ordered villagers through danger and into sanctuary.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["village-guardian/sanctuary-guide"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:language-target-progression",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:four-way-guardian-movement",
        "capability:ordered-villager-trail",
        "capability:wrong-villager-hide-penalty",
        "capability:monster-trail-disruption",
        "capability:sanctuary-level-progression",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input: SentenceInput = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createVillageGuardianController(
        input,
        sessionMode === "playing" ? (result, outcome) => context.complete(result, outcome) : () => undefined,
        { seed: context.seed, tutorialOnly: sessionMode !== "playing" },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "VILLAGE_GUARDIAN_READY",
        message: "Village Guardian rescue scene is ready.",
        details: { editionId: context.edition.id, levelCount: input.length, targetCount: controller.snapshot().targetCount },
      });
      return {
        width: VILLAGE_GUARDIAN_CANVAS.width,
        height: VILLAGE_GUARDIAN_CANVAS.height,
        render: { antialias: true, pixelArt: false },
        scene: createVillageGuardianScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          sessionMode,
          diagnostic: context.diagnostic,
        }),
      };
    },
  };
}
