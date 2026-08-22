import {
  createActorSpriteLayer,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  validateNonEmptyContent,
  type ActorSpriteLayer,
  type ActorSpriteLike,
  type APKInputController,
  type CartridgeGameConfigContext,
  type CompletionDelivery,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for the Storm the Castle Tower cartridge. */
export const STORM_CASTLE_TOWER_ID = "storm-castle-tower" as const;

/** Procedural canvas size used before the host applies responsive scaling. */
export const STORM_CASTLE_TOWER_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Number of climbable tower columns. */
export const STORM_CASTLE_TOWER_COLUMNS = 4;

/** Number of grid rows moved by one accepted direction action. */
export const STORM_CASTLE_TOWER_MOVE_STEP = 1;

/** Starting lives for one tower session. */
export const STORM_CASTLE_TOWER_INITIAL_LIVES = 3;

/** Keyboard bindings for four-way tower movement and window confirmation. */
export const STORM_CASTLE_TOWER_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
  Space: "confirm",
  Enter: "confirm",
});

/** One of the four directions available to the tower climber. */
export type StormCastleTowerDirection =
  | "left"
  | "right"
  | "up"
  | "down"
  | "move-left"
  | "move-right"
  | "move-up"
  | "move-down";

/** A deterministic falling hazard type. */
export type StormCastleTowerHazardType = "oil" | "rock";

/** Active or terminal phase in a tower session. */
export type StormCastleTowerPhase = "playing" | "victory" | "defeat";

/** Grid position in the four-column tower. */
export interface StormCastleTowerPosition {
  /** Zero-based tower column. */
  readonly col: number;
  /** Zero-based world row. Smaller rows are higher in the tower. */
  readonly row: number;
}

/** Collectible word window placed on the tower wall. */
export interface StormCastleTowerWindow {
  /** Stable window identity. */
  readonly id: string;
  /** World position of the window. */
  readonly position: StormCastleTowerPosition;
  /** Word printed in the window. */
  readonly word: string;
  /** Flattened sentence-sequence index for this word. */
  readonly wordIndex: number;
  /** Window lifecycle state. */
  readonly state: "open" | "closed" | "collected";
}

/** Falling oil or rock owned by the tower scene. */
export interface StormCastleTowerHazard {
  /** Stable deterministic hazard identity. */
  readonly id: string;
  /** Falling hazard visual and collision policy. */
  readonly type: StormCastleTowerHazardType;
  /** Column in which the hazard falls. */
  readonly column: number;
  /** World-space vertical position. */
  readonly y: number;
  /** Downward speed in world rows per second. */
  readonly speed: number;
}

/** Immutable state exposed by the transport-independent tower rules. */
export interface StormCastleTowerSnapshot {
  /** Deterministic seed used for window placement and hazard order. */
  readonly seed: number;
  /** Current tower phase. */
  readonly phase: StormCastleTowerPhase;
  /** Sentence item containing the active word. */
  readonly sentenceIndex: number;
  /** Word index within the active sentence item. */
  readonly wordIndex: number;
  /** Flattened index of the next ordered word. */
  readonly targetIndex: number;
  /** Total ordered words in the session. */
  readonly targetCount: number;
  /** Translation prompt for the active sentence item. */
  readonly prompt: string;
  /** Active sentence text. */
  readonly sentence: string;
  /** Next word to collect, or the final word after victory. */
  readonly answer: string;
  /** Semantic action that moves toward the current target window. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by the controller. */
  readonly availableActions: readonly InputActionId[];
  /** Current player grid position. */
  readonly player: StormCastleTowerPosition;
  /** Every placed word window. */
  readonly windows: readonly StormCastleTowerWindow[];
  /** Active falling hazards. */
  readonly hazards: readonly StormCastleTowerHazard[];
  /** Remaining player lives. */
  readonly lives: number;
  /** Starting player lives for this session. */
  readonly maxLives: number;
  /** Shared bounded resource alias for the remaining lives. */
  readonly energy: number;
  /** Correct collection count. */
  readonly correctAnswers: number;
  /** Collection attempts, excluding empty confirmations. */
  readonly totalAttempts: number;
  /** Current score. */
  readonly score: number;
  /** Most recent feedback outcome. */
  readonly lastOutcome?: "correct" | "incorrect" | "hazard";
  /** Camera movement in world pixels. */
  readonly cameraY: number;
  /** Alias used by responsive hosts for camera movement. */
  readonly cameraOffset: number;
  /** Number of tower rows climbed from the start. */
  readonly height: number;
  /** Maximum climbable height in world rows. */
  readonly maxHeight: number;
  /** Total deterministic simulation time. */
  readonly elapsedMs: number;
  /** Deterministic hazard clock retained across responsive reflows. */
  readonly hazardClockMs: number;
  /** Deterministic hazard sequence retained across responsive reflows. */
  readonly spawnCount: number;
  /** Deterministic random state retained across responsive reflows. */
  readonly randomState: number;
  /** First terminal result, when the session has ended. */
  readonly result?: GameResults;
  /** Whether scene cleanup has sealed this session. */
  readonly destroyed: boolean;
}

/** Result returned after movement or one nearby window confirmation. */
export interface StormCastleTowerActionResult {
  /** Whether the action was accepted by the active session. */
  readonly accepted: boolean;
  /** Whether a confirmed window held the next word. */
  readonly correct: boolean;
  /** Whether the ordered target advanced. */
  readonly progressed: boolean;
  /** Whether the session reached victory or defeat. */
  readonly terminal: boolean;
  /** Alias for terminal completion used by cartridge hosts. */
  readonly completed: boolean;
  /** First terminal result, when this action ended the session. */
  readonly result?: GameResults;
  /** State after applying the action. */
  readonly snapshot: StormCastleTowerSnapshot;
}

/** Transport-independent tower rules and lifecycle controls. */
export interface StormCastleTowerController {
  /** Returns an immutable snapshot of the tower session. */
  snapshot(): StormCastleTowerSnapshot;
  /** Moves the player by one bounded grid cell. */
  move(direction: StormCastleTowerDirection): StormCastleTowerSnapshot;
  /** Places the player at a bounded grid position for deterministic replays and tests. */
  moveTo(position: StormCastleTowerPosition): StormCastleTowerSnapshot;
  /** Applies one semantic action, including movement and confirmation. */
  choose(action: InputActionId): StormCastleTowerActionResult;
  /** Confirms the nearest nearby window, or a supplied nearby window identity. */
  collect(windowId?: string): StormCastleTowerActionResult;
  /** Advances hazards and deterministic tower time. */
  tick(deltaMs: number): StormCastleTowerSnapshot;
  /** Alias for advancing deterministic tower time. */
  advance(deltaMs: number): StormCastleTowerSnapshot;
  /** Spawns one deterministic falling hazard for testing or game rules. */
  spawnHazard(type?: StormCastleTowerHazardType, column?: number): StormCastleTowerHazard | undefined;
  /** Applies immediate hazard damage through the shared action result contract. */
  applyHazard(type?: StormCastleTowerHazardType): StormCastleTowerActionResult;
  /** Captures state before a responsive scene reflow. */
  capture(): StormCastleTowerSnapshot;
  /** Restores a state captured before a responsive scene reflow. */
  restore(snapshot: StormCastleTowerSnapshot): void;
  /** Permanently seals the session and prevents later result delivery. */
  destroy(): void;
}

/** Deterministic tuning options for controller tests and host replays. */
export interface StormCastleTowerOptions {
  /** Seed used for window columns and hazard columns. */
  readonly seed?: number;
  /** Starting life count. */
  readonly initialLives?: number;
  /** Starting life count alias used by other cartridge controllers. */
  readonly lives?: number;
  /** Milliseconds between automatic hazard drops. */
  readonly hazardIntervalMs?: number;
}

/** Minimal Phaser graphics surface used by the procedural tower scene. */
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

/** Minimal Phaser text surface used by the procedural tower scene. */
interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

/** Minimal Phaser canvas surface needed for pointer conversion. */
interface PhaserCanvasLike {
  getBoundingClientRect?(): {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

/** Minimal Phaser scene surface used by the tower cartridge. */
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
  events?: {
    once(event: string, listener: () => void): void;
  };
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

/** Display resources owned by one tower scene. */
interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly lives: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly windowLabels: readonly PhaserTextLike[];
}

/** Context passed from the cartridge factory to the tower renderer. */
interface StormCastleTowerSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: StormCastleTowerController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly targetCount: number;
  readonly sessionMode: CartridgeGameConfigContext["sessionMode"];
}

const COLUMN_COUNT = STORM_CASTLE_TOWER_COLUMNS;
const CELL_SIZE = 58;
const BASE_ROW = 3;
const ROW_GAP = 3;
const START_LIVES = STORM_CASTLE_TOWER_INITIAL_LIVES;
const HAZARD_INTERVAL_MS = 1_600;
const HAZARD_RADIUS = 0.7;
const HAZARD_SPEEDS: Readonly<Record<StormCastleTowerHazardType, number>> = Object.freeze({
  oil: 2.4,
  rock: 3.2,
});
const STORM_CASTLE_TOWER_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
]);

function freezePosition(col: number, row: number): StormCastleTowerPosition {
  return Object.freeze({ col, row });
}

function tokenizeSentence(sentence: string): readonly string[] {
  return Object.freeze(sentence.trim().split(/\s+/u).filter(Boolean));
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error("Storm Castle Tower seed must be finite");
  return (Math.abs(Math.trunc(seed)) >>> 0) || 0x9e3779b9;
}

function createRandom(seed: number): { next(): number; state(): number; restore(value: number): void } {
  let state = normalizeSeed(seed);
  return {
    next(): number {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 4_294_967_296;
    },
    state(): number {
      return state;
    },
    restore(value: number): void {
      if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
        throw new Error("Storm Castle Tower random state is invalid");
      }
      state = value || 0x9e3779b9;
    },
  };
}

function isStormCastleTowerDirection(value: string): value is StormCastleTowerDirection {
  return value === "left" || value === "right" || value === "up" || value === "down"
    || value === "move-left" || value === "move-right" || value === "move-up" || value === "move-down";
}

/** Maps a pointer or touch drag vector to one tower direction. */
export function getStormCastleTowerDirectionFromPointer(
  deltaX: number,
  deltaY: number,
): StormCastleTowerDirection | undefined {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return undefined;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return undefined;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return deltaX < 0 ? "left" : "right";
  return deltaY < 0 ? "up" : "down";
}

/** Maps a tap on the visible virtual D-pad to a semantic tower action. */
export function chooseStormCastleTowerDirectionFromPointer(
  pointerX: number,
  pointerY: number,
  sceneWidth: number,
  sceneHeight: number,
): InputActionId | undefined {
  const centerX = sceneWidth - 110;
  const centerY = sceneHeight - 102;
  const deltaX = pointerX - centerX;
  const deltaY = pointerY - centerY;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 28) return undefined;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 110) return undefined;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return deltaX < 0 ? "move-left" : "move-right";
  return deltaY < 0 ? "move-up" : "move-down";
}

function cloneWindow(window: StormCastleTowerWindow): StormCastleTowerWindow {
  return Object.freeze({
    ...window,
    position: freezePosition(window.position.col, window.position.row),
  });
}

function cloneHazard(hazard: StormCastleTowerHazard): StormCastleTowerHazard {
  return Object.freeze({ ...hazard });
}

function isTerminal(phase: StormCastleTowerPhase): boolean {
  return phase === "victory" || phase === "defeat";
}

function directionForAction(action: InputActionId): StormCastleTowerDirection | undefined {
  const direction = action.replace("move-", "");
  return isStormCastleTowerDirection(direction) ? direction : undefined;
}

/**
 * Creates the transport-independent Storm the Castle Tower controller.
 * @param input Untrusted sentence content for the session.
 * @param deliver Callback that receives the first terminal result.
 * @param options Deterministic placement, lives, and hazard options.
 * @param allowCompletion Whether the session may deliver a production result.
 * @returns A controller for the finite four-column tower session.
 * @throws When sentence content or the seed is invalid.
 */
export function createStormCastleTowerController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
  options: StormCastleTowerOptions | number = {},
  allowCompletion = true,
): StormCastleTowerController {
  const parsedInput = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "sentence");
  const resolvedOptions = typeof options === "number" ? { seed: options } : options;
  const seed = normalizeSeed(resolvedOptions.seed ?? 0);
  const targets = content.items.flatMap((item, sentenceIndex) =>
    tokenizeSentence(item.term).map((word, wordIndex) => ({
      id: `word:${sentenceIndex}:${wordIndex}`,
      word,
      sentenceIndex,
      wordIndex,
    })),
  );
  if (targets.length === 0) throw new Error("Storm Castle Tower requires at least one sentence word");

  const maximumRow = BASE_ROW + (targets.length - 1) * ROW_GAP;
  const startRow = maximumRow + 2;
  const startingLives = resolvedOptions.initialLives ?? resolvedOptions.lives ?? START_LIVES;
  if (!Number.isInteger(startingLives) || startingLives <= 0) {
    throw new Error("Storm Castle Tower initial lives must be a positive integer");
  }
  const hazardIntervalMs = resolvedOptions.hazardIntervalMs ?? HAZARD_INTERVAL_MS;
  if (!Number.isFinite(hazardIntervalMs) || hazardIntervalMs <= 0) {
    throw new Error("Storm Castle Tower hazard interval must be positive and finite");
  }
  const placementRandom = createRandom(seed);
  const initialPositions = targets.map((_, index) => freezePosition(
    Math.floor(placementRandom.next() * COLUMN_COUNT),
    maximumRow - index * ROW_GAP,
  ));
  const random = createRandom(seed);
  random.restore(placementRandom.state());
  let windows: StormCastleTowerWindow[] = targets.map((target, index) => Object.freeze({
    id: target.id,
    position: initialPositions[index]!,
    word: target.word,
    wordIndex: index,
    state: "open" as const,
  }));
  let player = freezePosition(1, startRow);
  let hazards: StormCastleTowerHazard[] = [];
  let accountant = createResultAccountant();
  let progression = createLanguageTargetProgression(targets.map((target) => target.id));
  const completion = createCompletionLatch(deliver);
  let phase: StormCastleTowerPhase = "playing";
  let targetIndex = 0;
  let lastOutcome: StormCastleTowerSnapshot["lastOutcome"];
  let elapsedMs = 0;
  let hazardClockMs = 0;
  let spawnCount = 0;
  let terminalResultValue: GameResults | undefined;
  let destroyed = false;

  const currentTarget = () => targets[Math.min(targetIndex, targets.length - 1)]!;
  const currentSentence = () => content.items[currentTarget().sentenceIndex]!;
  const climbHeight = () => startRow - player.row;
  const cameraY = () => climbHeight() * CELL_SIZE;
  const correctActionFor = (
    currentPlayer: StormCastleTowerPosition,
    currentWindows: readonly StormCastleTowerWindow[],
    currentTargetIndex: number,
  ): InputActionId => {
    if (currentTargetIndex >= targets.length) return "confirm";
    const targetWindow = currentWindows.find((window) => window.wordIndex === currentTargetIndex);
    if (!targetWindow || (targetWindow.position.col === currentPlayer.col && targetWindow.position.row === currentPlayer.row)) {
      return "confirm";
    }
    if (targetWindow.position.col < currentPlayer.col) return "move-left";
    if (targetWindow.position.col > currentPlayer.col) return "move-right";
    return targetWindow.position.row < currentPlayer.row ? "move-up" : "move-down";
  };

  const snapshot = (): StormCastleTowerSnapshot => {
    const target = currentTarget();
    const sentence = currentSentence();
    const height = climbHeight();
    return Object.freeze({
      seed,
      phase,
      sentenceIndex: target.sentenceIndex,
      wordIndex: target.wordIndex,
      targetIndex,
      targetCount: targets.length,
      prompt: sentence.translation,
      sentence: sentence.term,
      answer: target.word,
      correctAction: correctActionFor(player, windows, targetIndex),
      availableActions: STORM_CASTLE_TOWER_ACTIONS,
      player,
      windows: Object.freeze(windows.map(cloneWindow)),
      hazards: Object.freeze(hazards.map(cloneHazard)),
      lives: accountantLives,
      maxLives: startingLives,
      energy: accountantLives,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      ...(lastOutcome === undefined ? {} : { lastOutcome }),
      cameraY: cameraY(),
      cameraOffset: cameraY(),
      height,
      maxHeight: startRow,
      elapsedMs,
      hazardClockMs,
      spawnCount,
      randomState: random.state(),
      ...(terminalResultValue === undefined ? {} : { result: terminalResultValue }),
      destroyed,
    });
  };

  let accountantLives = startingLives;

  const terminalResult = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const finish = (nextPhase: "victory" | "defeat"): GameResults => {
    phase = nextPhase;
    const result = terminalResult();
    terminalResultValue = result;
    if (allowCompletion) completion.complete(result);
    return result;
  };

  const inactiveResult = (): StormCastleTowerActionResult => {
    const current = snapshot();
    return Object.freeze({
      accepted: false,
      correct: false,
      progressed: false,
      terminal: isTerminal(current.phase),
      completed: isTerminal(current.phase),
      ...(current.result === undefined ? {} : { result: current.result }),
      snapshot: current,
    });
  };

  const actionResult = (
    accepted: boolean,
    correct: boolean,
    progressed: boolean,
    result?: GameResults,
  ): StormCastleTowerActionResult => {
    const current = snapshot();
    return Object.freeze({
      accepted,
      correct,
      progressed,
      terminal: isTerminal(current.phase),
      completed: isTerminal(current.phase),
      ...(result === undefined ? {} : { result }),
      snapshot: current,
    });
  };

  const damage = (): GameResults | undefined => {
    if (destroyed || isTerminal(phase)) return undefined;
    accountantLives = Math.max(0, accountantLives - 1);
    lastOutcome = "hazard";
    if (accountantLives === 0) return finish("defeat");
    return undefined;
  };

  const restoreAccountant = (state: StormCastleTowerSnapshot): void => {
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
  };

  const controller: StormCastleTowerController = {
    snapshot,
    move(direction): StormCastleTowerSnapshot {
      if (destroyed || isTerminal(phase)) return snapshot();
      const normalizedDirection = direction.replace("move-", "");
      if (normalizedDirection === "left") player = freezePosition(Math.max(0, player.col - STORM_CASTLE_TOWER_MOVE_STEP), player.row);
      if (normalizedDirection === "right") player = freezePosition(Math.min(COLUMN_COUNT - 1, player.col + STORM_CASTLE_TOWER_MOVE_STEP), player.row);
      if (normalizedDirection === "up") player = freezePosition(player.col, Math.max(0, player.row - STORM_CASTLE_TOWER_MOVE_STEP));
      if (normalizedDirection === "down") player = freezePosition(player.col, Math.min(startRow, player.row + STORM_CASTLE_TOWER_MOVE_STEP));
      return snapshot();
    },
    moveTo(position): StormCastleTowerSnapshot {
      if (destroyed || isTerminal(phase)) return snapshot();
      if (!Number.isInteger(position.col) || !Number.isInteger(position.row)) {
        throw new Error("Storm Castle Tower position must use integer coordinates");
      }
      player = freezePosition(
        Math.max(0, Math.min(COLUMN_COUNT - 1, position.col)),
        Math.max(0, Math.min(startRow, position.row)),
      );
      return snapshot();
    },
    choose(action): StormCastleTowerActionResult {
      if (destroyed || isTerminal(phase)) return inactiveResult();
      if (typeof action !== "string" || !STORM_CASTLE_TOWER_ACTIONS.includes(action)) return inactiveResult();
      const direction = directionForAction(action);
      if (direction) {
        controller.move(direction);
        return actionResult(true, false, false);
      }
      if (action === "confirm") return controller.collect();
      return inactiveResult();
    },
    collect(windowId): StormCastleTowerActionResult {
      if (destroyed || isTerminal(phase)) return inactiveResult();
      const nearby = windows.filter((window) => window.state === "open"
        && Math.max(
          Math.abs(window.position.col - player.col),
          Math.abs(window.position.row - player.row),
        ) <= 1);
      const selected = windowId === undefined
        ? nearby.find((window) => window.position.col === player.col && window.position.row === player.row)
          ?? nearby.find((window) => window.wordIndex === targetIndex)
          ?? nearby[0]
        : nearby.find((window) => window.id === windowId);
      if (!selected) return actionResult(false, false, false);

      const match = progression.match(selected.id);
      accountant.recordAttempt({ correct: match.matched });
      if (!match.matched) {
        windows = windows.map((window) => window.id === selected.id
          ? { ...window, state: "closed" as const }
          : window);
        accountantLives = Math.max(0, accountantLives - 1);
        lastOutcome = "incorrect";
        const result = accountantLives === 0 ? finish("defeat") : undefined;
        return actionResult(true, false, false, result);
      }

      windows = windows.map((window) => window.id === selected.id
        ? { ...window, state: "collected" as const }
        : window);
      accountant.addScore(100);
      targetIndex += 1;
      if (!progression.isComplete) {
        windows = windows.map((window) => window.wordIndex === targetIndex && window.state === "closed"
          ? { ...window, state: "open" as const }
          : window);
      }
      lastOutcome = "correct";
      const result = progression.isComplete ? finish("victory") : undefined;
      return actionResult(true, true, true, result);
    },
    tick(deltaMs): StormCastleTowerSnapshot {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Storm Castle Tower delta must be non-negative and finite");
      if (destroyed || isTerminal(phase)) return snapshot();
      elapsedMs += deltaMs;
      hazardClockMs += deltaMs;
      while (hazardClockMs >= hazardIntervalMs && !isTerminal(phase)) {
        hazardClockMs -= hazardIntervalMs;
        controller.spawnHazard();
      }

      let hit = false;
      const nextHazards: StormCastleTowerHazard[] = [];
      for (const hazard of hazards) {
        const nextY = hazard.y + hazard.speed * deltaMs / 1_000;
        const crossedPlayer = hazard.column === player.col
          && hazard.y <= player.row + HAZARD_RADIUS
          && nextY >= player.row - HAZARD_RADIUS;
        if (crossedPlayer) {
          hit = true;
        } else if (nextY <= startRow + 3) {
          nextHazards.push({ ...hazard, y: nextY });
        }
      }
      hazards = nextHazards;
      if (hit) damage();
      return snapshot();
    },
    advance(deltaMs): StormCastleTowerSnapshot {
      return controller.tick(deltaMs);
    },
    spawnHazard(type, column): StormCastleTowerHazard | undefined {
      if (destroyed || isTerminal(phase)) return undefined;
      if (type !== undefined && type !== "oil" && type !== "rock") {
        throw new Error("Storm Castle Tower hazard type is invalid");
      }
      const hazardType = type ?? (random.next() < 0.5 ? "oil" : "rock");
      const hazardColumn = column ?? Math.floor(random.next() * COLUMN_COUNT);
      if (!Number.isInteger(hazardColumn) || hazardColumn < 0 || hazardColumn >= COLUMN_COUNT) {
        throw new Error("Storm Castle Tower hazard column is invalid");
      }
      const hazard = Object.freeze({
        id: `hazard:${spawnCount}`,
        type: hazardType,
        column: hazardColumn,
        y: player.row - 2,
        speed: HAZARD_SPEEDS[hazardType],
      });
      spawnCount += 1;
      hazards = [...hazards, hazard];
      return hazard;
    },
    applyHazard(type): StormCastleTowerActionResult {
      if (destroyed || isTerminal(phase)) return inactiveResult();
      if (type !== undefined && type !== "oil" && type !== "rock") {
        throw new Error("Storm Castle Tower hazard type is invalid");
      }
      const result = damage();
      return actionResult(true, false, false, result);
    },
    capture: snapshot,
    restore(state): void {
      if (destroyed) return;
      if (state === null || typeof state !== "object") throw new Error("Storm Castle Tower responsive state is invalid");
      if (completion.hasCompleted && state.phase === "playing") {
        throw new Error("Storm Castle Tower cannot restore active state after completion");
      }
      if (state.seed !== seed || state.targetCount !== targets.length || state.maxLives !== startingLives
        || state.maxHeight !== startRow || state.destroyed !== false) {
        throw new Error("Storm Castle Tower responsive state identity is invalid");
      }
      if (!(state.phase === "playing" || state.phase === "victory" || state.phase === "defeat")) {
        throw new Error("Storm Castle Tower responsive phase is invalid");
      }
      if (!Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > targets.length) {
        throw new Error("Storm Castle Tower responsive progress is invalid");
      }
      if ((state.phase === "playing" && (state.targetIndex === targets.length || state.lives === 0))
        || (state.phase === "victory" && state.targetIndex !== targets.length)
        || (state.phase === "defeat" && state.lives !== 0)) {
        throw new Error("Storm Castle Tower responsive phase is unwinnable");
      }
      const displayTarget = targets[Math.min(state.targetIndex, targets.length - 1)]!;
      const displaySentence = content.items[displayTarget.sentenceIndex]!;
      if (state.sentenceIndex !== displayTarget.sentenceIndex
        || state.wordIndex !== displayTarget.wordIndex
        || state.prompt !== displaySentence.translation
        || state.sentence !== displaySentence.term
        || state.answer !== displayTarget.word) {
        throw new Error("Storm Castle Tower responsive target content is invalid");
      }
      if (!Array.isArray(state.availableActions)
        || state.availableActions.length !== STORM_CASTLE_TOWER_ACTIONS.length
        || state.availableActions.some((action, index) => action !== STORM_CASTLE_TOWER_ACTIONS[index])) {
        throw new Error("Storm Castle Tower responsive actions are invalid");
      }
      if (!Array.isArray(state.windows) || state.windows.length !== targets.length) {
        throw new Error("Storm Castle Tower responsive windows are invalid");
      }
      const windowIds = new Set<string>();
      for (const [index, window] of state.windows.entries()) {
        const expected = targets[index];
        const expectedPosition = initialPositions[index];
        if (window === null || typeof window !== "object" || !expected || !expectedPosition || windowIds.has(window.id)
          || window.id !== expected.id || window.word !== expected.word || window.wordIndex !== index
          || window.position.col !== expectedPosition.col || window.position.row !== expectedPosition.row
          || !Number.isInteger(window.position.col) || window.position.col < 0 || window.position.col >= COLUMN_COUNT
          || !Number.isInteger(window.position.row) || window.position.row < BASE_ROW || window.position.row > maximumRow
          || !(window.state === "open" || window.state === "closed" || window.state === "collected")) {
          throw new Error("Storm Castle Tower responsive window entity is invalid");
        }
        windowIds.add(window.id);
        const expectedState = index < state.targetIndex || state.phase === "victory" ? "collected" : undefined;
        if (expectedState !== undefined && window.state !== expectedState) {
          throw new Error("Storm Castle Tower responsive window progress is invalid");
        }
        if (expectedState === undefined && window.state === "collected") {
          throw new Error("Storm Castle Tower responsive window skips a target");
        }
      }
      const currentWindow = state.windows[state.targetIndex];
      if (state.phase !== "victory" && (!currentWindow || currentWindow.state !== "open")) {
        throw new Error("Storm Castle Tower responsive state current target is unwinnable");
      }
      if (state.player === null || typeof state.player !== "object"
        || !Number.isInteger(state.player.col) || !Number.isInteger(state.player.row)
        || state.player.col < 0 || state.player.col >= COLUMN_COUNT
        || state.player.row < 0 || state.player.row > startRow) {
        throw new Error("Storm Castle Tower responsive player is invalid");
      }
      if (state.correctAction !== correctActionFor(state.player, state.windows, state.targetIndex)) {
        throw new Error("Storm Castle Tower responsive correct action is invalid");
      }
      if (!Number.isInteger(state.lives) || state.lives < 0 || state.lives > startingLives
        || state.energy !== state.lives) {
        throw new Error("Storm Castle Tower responsive resources are invalid");
      }
      if (!Number.isInteger(state.correctAnswers) || state.correctAnswers !== state.targetIndex
        || !Number.isInteger(state.totalAttempts) || state.totalAttempts < state.correctAnswers
        || !Number.isInteger(state.score) || state.score !== state.correctAnswers * 100) {
        throw new Error("Storm Castle Tower responsive counters are invalid");
      }
      if (state.lastOutcome !== undefined && !["correct", "incorrect", "hazard"].includes(state.lastOutcome)) {
        throw new Error("Storm Castle Tower responsive outcome is invalid");
      }
      if (!Number.isFinite(state.elapsedMs) || state.elapsedMs < 0
        || !Number.isFinite(state.hazardClockMs) || state.hazardClockMs < 0
        || !Number.isInteger(state.spawnCount) || state.spawnCount < 0
        || !Number.isInteger(state.randomState) || state.randomState <= 0 || state.randomState > 0xffffffff
        || state.height !== startRow - state.player.row
        || state.cameraY !== (startRow - state.player.row) * CELL_SIZE
        || state.cameraOffset !== state.cameraY) {
        throw new Error("Storm Castle Tower responsive clocks are invalid");
      }
      if (!Array.isArray(state.hazards) || state.hazards.length > state.spawnCount) {
        throw new Error("Storm Castle Tower responsive state hazards are invalid");
      }
      const hazardIds = new Set<string>();
      for (const hazard of state.hazards) {
        if (hazard === null || typeof hazard !== "object") {
          throw new Error("Storm Castle Tower responsive hazard entity is invalid");
        }
        const sequence = /^hazard:(\d+)$/u.exec(hazard.id)?.[1];
        const expectedSpeed = hazard.type === "oil"
          ? HAZARD_SPEEDS.oil
          : hazard.type === "rock" ? HAZARD_SPEEDS.rock : undefined;
        if (!sequence || hazardIds.has(hazard.id) || Number(sequence) >= state.spawnCount
          || (hazard.type !== "oil" && hazard.type !== "rock")
          || !Number.isInteger(hazard.column) || hazard.column < 0 || hazard.column >= COLUMN_COUNT
          || !Number.isFinite(hazard.y) || hazard.y < -2 || hazard.y > startRow + 3
          || hazard.speed !== expectedSpeed) {
          throw new Error("Storm Castle Tower responsive hazard entity is invalid");
        }
        hazardIds.add(hazard.id);
      }
      if (state.phase === "playing" && state.result !== undefined) {
        throw new Error("Storm Castle Tower active state has a terminal result");
      }
      if (state.phase !== "playing") {
        if (state.result === undefined) throw new Error("Storm Castle Tower terminal result is missing");
        const restoredResult = gameResultsSchema.parse(state.result);
        const expectedAccountant = createResultAccountant();
        for (let index = 0; index < state.totalAttempts; index += 1) {
          expectedAccountant.recordAttempt({ correct: index < state.correctAnswers });
        }
        expectedAccountant.addScore(state.score);
        const expectedResult = gameResultsSchema.parse(
          finalizeResult(expectedAccountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
        );
        if (restoredResult.accuracy !== expectedResult.accuracy || restoredResult.xp !== expectedResult.xp
          || restoredResult.score !== expectedResult.score || restoredResult.correctAnswers !== expectedResult.correctAnswers
          || restoredResult.totalAttempts !== expectedResult.totalAttempts) {
          throw new Error("Storm Castle Tower terminal result is inconsistent");
        }
      }
      windows = state.windows.map(cloneWindow);
      hazards = state.hazards.map(cloneHazard);
      player = freezePosition(state.player.col, state.player.row);
      phase = state.phase;
      targetIndex = state.targetIndex;
      accountantLives = state.lives;
      lastOutcome = state.lastOutcome;
      elapsedMs = state.elapsedMs;
      hazardClockMs = state.hazardClockMs;
      spawnCount = state.spawnCount;
      random.restore(state.randomState);
      restoreAccountant(state);
      terminalResultValue = state.result;
      progression = createLanguageTargetProgression(targets.map((target) => target.id));
      for (let index = 0; index < targetIndex; index += 1) progression.match(targets[index]!.id);
      destroyed = false;
      if (phase !== "playing") {
        completion.sealWithoutDelivery();
      }
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  };

  return Object.freeze(controller);
}

function createScene(context: StormCastleTowerSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let animationMs = 0;
  let previousKeys = new Set<string>();
  let cleaned = false;
  const normalize = createInputActionNormalizer({
    keyboard: STORM_CASTLE_TOWER_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
    pointerDrag: {
      leftAction: "move-left",
      rightAction: "move-right",
      upAction: "move-up",
      downAction: "move-down",
      threshold: 24,
    },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 4_000;
    if (context.sessionMode === "playing") context.controller.tick(deltaMs);
  });

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? STORM_CASTLE_TOWER_CANVAS.width,
    height: scene.scale?.height ?? STORM_CASTLE_TOWER_CANVAS.height,
  });

  const pointerInScene = (
    scene: PhaserSceneLike,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Readonly<{ x: number; y: number }> => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x, y };
    return {
      x: (x - rect.left) * width / rect.width,
      y: (y - rect.top) * height / rect.height,
    };
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const towerWidth = Math.min(width * 0.72, 620);
    const towerLeft = (width - towerWidth) / 2;
    const columnWidth = towerWidth / COLUMN_COUNT;
    const playerY = height * 0.72;
    const pulse = Math.sin(animationMs / 420) * 2;
    const worldY = (row: number): number => playerY + (row - state.player.row) * CELL_SIZE;

    resources.graphics.clear();
    if (!resources.art.ground("world:ground", width, height)) resources.graphics.fillStyle(0x07111f, 1).fillRect(0, 0, width, height);
    resources.graphics.fillStyle(0x102b43, 0.8).fillCircle(width * 0.12, height * 0.2, 72);
    resources.graphics.fillStyle(0x1d4260, 0.65).fillCircle(width * 0.86, height * 0.28, 96);
    resources.graphics.fillStyle(0x3f334b, 1).fillRect(towerLeft, 0, towerWidth, height);
    resources.graphics.lineStyle(4, 0xb58a5b, 0.8).strokeRoundedRect(towerLeft, -20, towerWidth, height + 40, 12);
    for (let column = 1; column < COLUMN_COUNT; column += 1) {
      resources.graphics.fillStyle(0x2b2639, 0.9).fillRect(towerLeft + column * columnWidth - 4, 0, 8, height);
    }
    for (let row = Math.floor(state.player.row - 5); row <= state.player.row + 5; row += 1) {
      const y = worldY(row);
      resources.graphics.lineStyle(2, 0x765b55, 0.7).strokeRoundedRect(towerLeft + 5, y - 25, towerWidth - 10, 50, 5);
    }

    for (const [index, window] of state.windows.entries()) {
      const x = towerLeft + columnWidth * (window.position.col + 0.5);
      const y = worldY(window.position.row);
      const open = window.state === "open";
      const target = window.wordIndex === state.targetIndex && open;
      resources.graphics.fillStyle(
        window.state === "collected" ? 0x2f855a : window.state === "closed" ? 0x291d2e : target ? 0xd28b2d : 0x4b6685,
        open ? 0.95 : 0.55,
      ).fillRoundedRect(x - columnWidth * 0.31, y - 19, columnWidth * 0.62, 38, 8);
      resources.graphics.lineStyle(2, target ? 0xffdc7c : 0xa8c4d8, 0.9)
        .strokeRoundedRect(x - columnWidth * 0.31, y - 19, columnWidth * 0.62, 38, 8);
      resources.windowLabels[index]?.setText(open ? window.word : window.state === "collected" ? "✓" : "SHUT")
        .setPosition(x - columnWidth * 0.27, y - 8);
    }

    for (const hazard of state.hazards) {
      const x = towerLeft + columnWidth * (hazard.column + 0.5);
      const y = worldY(hazard.y);
      if (hazard.type === "oil") {
        resources.graphics.fillStyle(0xf0a21a, 0.95).fillRoundedRect(x - 19, y - 10, 38, 20, 8);
      } else {
        resources.graphics.fillStyle(0x8b735b, 1).fillCircle(x, y, 15);
        resources.graphics.lineStyle(2, 0xd3b18b, 0.8).strokeRoundedRect(x - 12, y - 12, 24, 24, 5);
      }
    }
    const dpadX = width - 110;
    const dpadY = height - 102;
    resources.graphics.fillStyle(0x20374d, 0.9).fillRoundedRect(dpadX - 46, dpadY - 46, 92, 92, 18);
    resources.graphics.lineStyle(2, 0x8fb6ca, 0.8).strokeRoundedRect(dpadX - 46, dpadY - 46, 92, 92, 18);
    resources.graphics.fillStyle(0xd3ecf5, 0.9).fillTriangle(dpadX, dpadY - 34, dpadX - 12, dpadY - 12, dpadX + 12, dpadY - 12);
    resources.graphics.fillTriangle(dpadX, dpadY + 34, dpadX - 12, dpadY + 12, dpadX + 12, dpadY + 12);
    resources.graphics.fillTriangle(dpadX - 34, dpadY, dpadX - 12, dpadY - 12, dpadX - 12, dpadY + 12);
    resources.graphics.fillTriangle(dpadX + 34, dpadY, dpadX + 12, dpadY - 12, dpadX + 12, dpadY + 12);
    const playerX = towerLeft + columnWidth * (state.player.col + 0.5);
    if (!resources.art.place("player", "player:idle", {
      x: playerX,
      y: playerY + pulse - 4,
      width: 58,
      depth: 8,
    })) {
      resources.graphics.fillStyle(0xf6d365, 1).fillCircle(playerX, playerY + pulse - 17, 13);
      resources.graphics.fillStyle(0x49a6c8, 1).fillTriangle(playerX - 23, playerY + pulse + 18, playerX, playerY - 39 + pulse, playerX + 23, playerY + pulse + 18);
    }
    resources.art.sweep();

    resources.title.setText("STORM THE CASTLE TOWER").setPosition(26, 18);
    resources.prompt.setText(`Climb for: ${state.prompt}`).setPosition(26, 57);
    resources.progress.setText(
      `${composition?.profile === "compact" ? "Compact climb" : "Tower climb"}  •  Word ${Math.min(state.targetIndex + 1, context.targetCount)} of ${context.targetCount}  •  Height ${state.height}`,
    ).setPosition(26, 91);
    resources.lives.setText(`Lives: ${"♥".repeat(state.lives)}${"♡".repeat(Math.max(0, state.maxLives - state.lives))}`).setPosition(width - 180, 22);
    resources.feedback.setText(
      state.phase === "victory"
        ? "The tower is secure!"
        : state.phase === "defeat"
          ? "The tower has fallen."
          : state.lastOutcome === "incorrect"
            ? "That window shuts. Find the next word."
            : state.lastOutcome === "hazard"
              ? "Watch for oil and falling rocks."
              : "Move near a word window, then confirm.",
    ).setPosition(26, height - 66);
    resources.instructions.setText("WASD / arrows move  •  Space / Enter collect  •  Swipe to climb").setPosition(26, height - 34);
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    frameScheduler.cancel();
    context.controller.destroy();
    if (!resources) return;
    resources.graphics.destroy();
    resources.title.destroy();
    resources.prompt.destroy();
    resources.progress.destroy();
    resources.lives.destroy();
    resources.feedback.destroy();
    resources.instructions.destroy();
    for (const label of resources.windowLabels) label.destroy();
    resources = undefined;
    previousKeys = new Set<string>();
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
    if (!this.add) throw new Error("Storm Castle Tower requires Phaser display services");
    const textStyle = { fontFamily: "Arial", color: "#f7fbff", fontSize: "18px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(26, 18, "STORM THE CASTLE TOWER", { ...textStyle, fontSize: "28px", fontStyle: "bold" }),
      prompt: this.add.text(26, 57, "", { ...textStyle, fontSize: "22px", wordWrap: { width: 850 } }),
      progress: this.add.text(26, 91, "", { ...textStyle, fontSize: "15px", color: "#b9d8eb" }),
      lives: this.add.text(0, 0, "", { ...textStyle, fontSize: "18px", color: "#ffcf77" }),
      feedback: this.add.text(26, 0, "", { ...textStyle, fontSize: "17px", color: "#ffdc7c" }),
      instructions: this.add.text(26, 0, "", { ...textStyle, fontSize: "15px", color: "#c6d3df" }),
      windowLabels: context.controller.snapshot().windows.map((window) => this.add!.text(0, 0, window.word, {
        ...textStyle,
        fontSize: "15px",
        wordWrap: { width: 80 },
      })),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources || cleaned) return;
    frameScheduler.tick(delta);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action) context.controller.choose(action);
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const { width, height } = dimensions(this);
        const pointer = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
        const deltaX = input.pointer.x - input.pointer.startX;
        const deltaY = input.pointer.y - input.pointer.startY;
        const direction = getStormCastleTowerDirectionFromPointer(deltaX, deltaY);
        if (direction) {
          const action = normalize({ modality: "pointer", phase: "drag", x: pointer.x, y: pointer.y, deltaX, deltaY })[0]?.action;
          if (action) context.controller.choose(action);
        } else {
          const action = chooseStormCastleTowerDirectionFromPointer(pointer.x, pointer.y, width, height)
            ?? normalize({ modality: "pointer", phase: "up", x: pointer.x, y: pointer.y })[0]?.action;
          if (action) context.controller.choose(action);
        }
      }
    }
    updateView(this);
  };

  return {
    key: STORM_CASTLE_TOWER_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: (): StormCastleTowerSnapshot => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown): void => {
        if (typeof state !== "object" || state === null) throw new Error("Storm Castle Tower responsive state is invalid");
        context.controller.restore(state as StormCastleTowerSnapshot);
      },
      apkRecompose: (nextComposition: StormCastleTowerSceneContext["composition"]): void => {
        composition = nextComposition;
      },
    },
  };
}

function moveControllerToWindow(
  controller: StormCastleTowerController,
  window: StormCastleTowerWindow,
): void {
  const position = controller.snapshot().player;
  const horizontal = window.position.col - position.col;
  const vertical = window.position.row - position.row;
  const horizontalDirection: StormCastleTowerDirection = horizontal < 0 ? "left" : "right";
  const verticalDirection: StormCastleTowerDirection = vertical < 0 ? "up" : "down";
  for (let index = 0; index < Math.abs(horizontal); index += 1) controller.move(horizontalDirection);
  for (let index = 0; index < Math.abs(vertical); index += 1) controller.move(verticalDirection);
}

/**
 * Creates a runtime-compatible Storm the Castle Tower cartridge.
 * @returns A sentence-mode standard-experience cartridge with a bespoke tower scene.
 */
export function createStormCastleTowerCartridge(): StandardExperienceCartridge {
  let activeController: StormCastleTowerController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: STORM_CASTLE_TOWER_ID,
    title: "Storm the Castle Tower",
    description: "Climb a four-column castle tower and collect sentence windows while oil and rocks fall.",
    inputMode: "sentence",
    objective: "Collect every ordered sentence word before the tower loses all three lives.",
    mechanicInstruction: "Move near the next word window and confirm to collect it.",
    keyboardKeys: ["WASD", "Arrow keys", "Space", "Enter"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller || controller.snapshot().phase !== "playing") return;
      const state = controller.snapshot();
      const candidate = actionId === "action:select-correct"
        ? state.windows.find((window) => window.wordIndex === state.targetIndex && window.state === "open")
        : state.windows.find((window) => window.wordIndex !== state.targetIndex && window.state === "open");
      if (!candidate) return;
      moveControllerToWindow(controller, candidate);
      controller.collect(candidate.id);
    },
  });

  return {
    manifest: {
      id: STORM_CASTLE_TOWER_ID,
      title: "Storm the Castle Tower",
      description: "Climb a four-column castle tower and collect sentence windows while oil and rocks fall.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["storm-castle-tower/player-climber"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:camera-follow",
        "capability:deterministic-hazards",
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
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createStormCastleTowerController(
        input,
        sessionMode === "playing"
          ? (result) => context.complete(result, controller.snapshot().phase === "victory" ? "victory" : "defeat")
          : () => undefined,
        context.seed ?? 0,
        sessionMode === "playing",
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "STORM_CASTLE_TOWER_READY",
        message: "Storm Castle Tower four-column climb is ready.",
        details: { editionId: context.edition.id, targetCount: controller.snapshot().targetCount },
      });
      return {
        width: STORM_CASTLE_TOWER_CANVAS.width,
        height: STORM_CASTLE_TOWER_CANVAS.height,
        render: { antialias: true, pixelArt: false },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          targetCount: controller.snapshot().targetCount,
          sessionMode,
        }),
      };
    },
  };
}
