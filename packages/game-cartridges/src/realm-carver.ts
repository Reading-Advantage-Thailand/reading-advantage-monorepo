import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createActorSpriteLayer,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
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
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Number of cells on each side of the bounded Realm Carver board. */
export const REALM_CARVER_GRID_SIZE = 12;

/** Stable public identifier for the Realm Carver cartridge. */
export const REALM_CARVER_ID = "realm-carver" as const;

/** Logical canvas dimensions used before the APK host applies responsive scaling. */
export const REALM_CARVER_CANVAS = Object.freeze({ width: 960, height: 540 });

/** A cell's current territory state. */
export type RealmCarverCellState = "wild" | "claimed" | "trail";

/** One cardinal direction accepted by Realm Carver movement. */
export type RealmCarverDirection = "left" | "right" | "up" | "down";

/** One immutable board coordinate. */
export interface RealmCarverPoint {
  /** Horizontal grid coordinate. */
  readonly x: number;
  /** Vertical grid coordinate. */
  readonly y: number;
}

/** One ordered word beacon on the territory board. */
export interface RealmCarverWordSnapshot {
  /** Stable word identity. */
  readonly id: string;
  /** Word that the learner must capture. */
  readonly term: string;
  /** Sentence translation shown in the prompt. */
  readonly translation: string;
  /** Word order in the flattened sentence. */
  readonly order: number;
  /** Current word location. */
  readonly position: RealmCarverPoint;
  /** Horizontal location alias for renderer adapters. */
  readonly x: number;
  /** Vertical location alias for renderer adapters. */
  readonly y: number;
  /** Whether the word remains available for capture. */
  readonly status: "active" | "captured";
  /** Number of incorrect captures that relocated this word. */
  readonly relocations: number;
}

/** One deterministic monster hazard on the territory board. */
export interface RealmCarverMonsterSnapshot {
  /** Stable monster identity. */
  readonly id: string;
  /** Horizontal grid coordinate. */
  readonly x: number;
  /** Vertical grid coordinate. */
  readonly y: number;
  /** Horizontal one-cell movement direction. */
  readonly dx: -1 | 0 | 1;
  /** Vertical one-cell movement direction. */
  readonly dy: -1 | 0 | 1;
}

/** Active or terminal Realm Carver phase. */
export type RealmCarverPhase = "playing" | "victory" | "defeat";

/** Learning outcome recorded by the most recent captured word. */
export type RealmCarverOutcome = "correct" | "incorrect";

/** Domain event produced by one movement, confirmation, or hazard action. */
export type RealmCarverEvent =
  | "moved"
  | "blocked"
  | "trail-started"
  | "trail-extended"
  | "trail-closed"
  | "word-correct"
  | "word-wrong"
  | "player-trail-collision"
  | "monster-trail-collision";

/** Immutable player state exposed by the controller. */
export interface RealmCarverPlayerSnapshot {
  /** Horizontal grid coordinate. */
  readonly x: number;
  /** Vertical grid coordinate. */
  readonly y: number;
  /** Current hit points. */
  readonly hp: number;
  /** Starting hit points. */
  readonly maxHp: number;
}

/** Complete immutable state needed to redraw or recompose a Realm Carver scene. */
export interface RealmCarverSnapshot {
  /** Deterministic seed used for placements and hazard motion. */
  readonly seed: number;
  /** Current session phase. */
  readonly phase: RealmCarverPhase;
  /** Legacy status alias for the current session phase. */
  readonly status: RealmCarverPhase;
  /** Bounded board side length. */
  readonly gridSize: number;
  /** Current board cells indexed by row and then column. */
  readonly grid: readonly (readonly RealmCarverCellState[])[];
  /** Current player state. */
  readonly player: RealmCarverPlayerSnapshot;
  /** Coordinates drawn since the player left claimed territory. */
  readonly trail: readonly RealmCarverPoint[];
  /** Number of cells currently claimed. */
  readonly claimedCells: number;
  /** Ordered word beacons. */
  readonly words: readonly RealmCarverWordSnapshot[];
  /** Remaining monsters. */
  readonly monsters: readonly RealmCarverMonsterSnapshot[];
  /** IDs of words successfully captured in order. */
  readonly capturedWordIds: readonly string[];
  /** Index of the next required word. */
  readonly targetIndex: number;
  /** Number of ordered words in the session. */
  readonly targetCount: number;
  /** Translation prompt for the current target. */
  readonly prompt: string;
  /** Current target word answer. */
  readonly answer: string;
  /** Semantic action used to evaluate the next learning capture. */
  readonly correctAction: InputActionId;
  /** Movement and confirmation actions accepted by the session. */
  readonly availableActions: readonly InputActionId[];
  /** Current hit points. */
  readonly hp: number;
  /** Starting hit points. */
  readonly maxHp: number;
  /** Current hit points, retained as a HUD-compatible alias. */
  readonly lives: number;
  /** Current hit points, retained as the shared energy resource alias. */
  readonly energy: number;
  /** Current score. */
  readonly score: number;
  /** Number of correct word captures. */
  readonly correctAnswers: number;
  /** Number of word capture attempts. */
  readonly totalAttempts: number;
  /** Most recent word outcome, when one exists. */
  readonly lastOutcome: RealmCarverOutcome | undefined;
  /** Most recent domain event, when one exists. */
  readonly lastEvent: RealmCarverEvent | undefined;
  /** Elapsed gameplay time retained across responsive reflows. */
  readonly gameTime: number;
  /** Monster simulation remainder retained across responsive reflows. */
  readonly monsterMotionMs: number;
  /** Whether scene cleanup permanently sealed the controller. */
  readonly destroyed: boolean;
  /** First terminal result, when the session has ended. */
  readonly result?: GameResults;
}

/** Result returned after one movement, confirmation, or hazard action. */
export interface RealmCarverActionResult extends RealmCarverSnapshot {
  /** Whether the controller accepted the action. */
  readonly accepted: boolean;
  /** Whether the action captured the current target correctly. */
  readonly correct: boolean;
  /** Whether the target index advanced. */
  readonly progressed: boolean;
  /** Whether this action reached a terminal phase. */
  readonly terminal: boolean;
  /** Compatibility alias for terminal. */
  readonly completed: boolean;
  /** Domain event produced by the action, when one exists. */
  readonly event?: RealmCarverEvent;
  /** Learning outcome produced by the action, when one exists. */
  readonly outcome?: RealmCarverOutcome;
  /** Terminal result produced by this action, when one exists. */
  readonly result?: GameResults;
  /** State after the action. */
  readonly snapshot: RealmCarverSnapshot;
}

/** Transport-independent Realm Carver rules and scene lifecycle controls. */
export interface RealmCarverController {
  /** Returns the current immutable territory state. */
  snapshot(): RealmCarverSnapshot;
  /** Moves the player one bounded cell in a cardinal direction. */
  move(direction: RealmCarverDirection): RealmCarverActionResult;
  /** Closes and evaluates the current drawn loop when the player is on claimed territory. */
  confirm(): RealmCarverActionResult;
  /** Applies one normalized APK movement action. */
  choose(action: InputActionId): RealmCarverActionResult;
  /** Advances monster motion and checks for trail collisions. */
  tick(deltaMs: number): RealmCarverActionResult;
  /** Applies one monster-trail hazard for deterministic tests and hosts. */
  applyHazard(): RealmCarverActionResult;
  /** Captures state before a responsive scene transition. */
  capture(): RealmCarverSnapshot;
  /** Restores validated state captured before a responsive scene transition. */
  restore(snapshot: RealmCarverSnapshot): void;
  /** Seals the controller and prevents later mutation or result delivery. */
  destroy(): void;
}

/** Deterministic setup options for one Realm Carver session. */
export interface RealmCarverControllerOptions {
  /** Host seed used for word placement and monster motion. */
  readonly seed?: number;
  /** Optional deterministic source used to derive a host seed. */
  readonly rng?: () => number;
}

interface MutablePoint {
  x: number;
  y: number;
}

interface MutableWord {
  id: string;
  term: string;
  translation: string;
  order: number;
  position: MutablePoint;
  status: "active" | "captured";
  relocations: number;
}

interface MutableMonster {
  id: string;
  x: number;
  y: number;
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
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

interface PhaserCanvasLike {
  getBoundingClientRect?(): {
    readonly left: number;
    readonly top?: number;
    readonly width: number;
    readonly height?: number;
  };
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
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly hud: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly dpadUp: PhaserTextLike;
  readonly dpadLeft: PhaserTextLike;
  readonly dpadDown: PhaserTextLike;
  readonly dpadRight: PhaserTextLike;
  readonly wordLabels: readonly PhaserTextLike[];
}

interface RealmCarverSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: RealmCarverController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
}

const MOVEMENT_ACTIONS = Object.freeze([
  "move-left",
  "move-up",
  "move-down",
  "move-right",
] as const);

/** Semantic actions accepted by the Realm Carver controller. */
export const REALM_CARVER_AVAILABLE_ACTIONS = Object.freeze([
  ...MOVEMENT_ACTIONS,
  "confirm",
] as const satisfies readonly InputActionId[]);

const KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
  ArrowRight: "move-right",
  KeyD: "move-right",
  Enter: "confirm",
  Space: "confirm",
});

/** Keyboard bindings for four-way Realm Carver movement and loop confirmation. */
export const REALM_CARVER_KEYBOARD_BINDINGS = KEYBOARD_BINDINGS;

const WORD_SPAWNS: readonly RealmCarverPoint[] = Object.freeze([
  { x: 3, y: 3 },
  { x: 8, y: 3 },
  { x: 3, y: 8 },
  { x: 8, y: 8 },
  { x: 5, y: 5 },
  { x: 6, y: 6 },
  { x: 4, y: 7 },
  { x: 7, y: 4 },
]);

const INITIAL_MONSTERS: readonly MutableMonster[] = Object.freeze([
  { id: "monster:0", x: 5, y: 5, dx: 1, dy: 0 },
  { id: "monster:1", x: 8, y: 6, dx: -1, dy: 0 },
]);

/** Maximum direct controller delta accepted for one simulation tick. */
const MAX_TICK_DELTA_MS = 50;

/** Modulus used to keep deterministic setup values within safe integer arithmetic. */
const SEED_MODULUS = 2_147_483_647;

const directionDelta = (direction: RealmCarverDirection): MutablePoint => {
  switch (direction) {
    case "left": return { x: -1, y: 0 };
    case "right": return { x: 1, y: 0 };
    case "up": return { x: 0, y: -1 };
    case "down": return { x: 0, y: 1 };
  }
};

const actionForDirection = (direction: RealmCarverDirection): InputActionId => `move-${direction}` as InputActionId;

const directionForAction = (action: InputActionId): RealmCarverDirection | undefined => {
  switch (action) {
    case "move-left": return "left";
    case "move-right": return "right";
    case "move-up": return "up";
    case "move-down": return "down";
    default: return undefined;
  }
};

function cloneGrid(grid: readonly (readonly RealmCarverCellState[])[]): RealmCarverCellState[][] {
  return grid.map((row) => [...row]);
}

function createInitialGrid(): RealmCarverCellState[][] {
  return Array.from({ length: REALM_CARVER_GRID_SIZE }, (_, y) =>
    Array.from({ length: REALM_CARVER_GRID_SIZE }, (_, x) =>
      x === 0 || y === 0 || x === REALM_CARVER_GRID_SIZE - 1 || y === REALM_CARVER_GRID_SIZE - 1
        ? "claimed"
        : "wild",
    ),
  );
}

function isPointInBounds(point: RealmCarverPoint): boolean {
  return point.x >= 0
    && point.x < REALM_CARVER_GRID_SIZE
    && point.y >= 0
    && point.y < REALM_CARVER_GRID_SIZE;
}

function pointKey(point: RealmCarverPoint): string {
  return `${point.x}:${point.y}`;
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error("Realm Carver seed must be finite");
  return Math.abs(Math.trunc(seed)) % SEED_MODULUS;
}

function seededUnit(seed: number, index: number, salt: number): number {
  let value = (seed + Math.imul(index + 1, 48_271) + Math.imul(salt + 1, 12_289)) % SEED_MODULUS;
  value = (value * 48_271) % SEED_MODULUS;
  return value / SEED_MODULUS;
}

function initialWordPosition(seed: number, order: number): RealmCarverPoint {
  const preferred = WORD_SPAWNS[order];
  if (seed === 0 && preferred) return { ...preferred };
  const interiorSize = REALM_CARVER_GRID_SIZE - 2;
  const cellCount = interiorSize * interiorSize;
  const start = Math.floor(seededUnit(seed, order, 1) * cellCount);
  return {
    x: 1 + (start % interiorSize),
    y: 1 + Math.floor(start / interiorSize),
  };
}

function initialMonsters(seed: number): MutableMonster[] {
  if (seed === 0) return INITIAL_MONSTERS.map((monster) => ({ ...monster }));
  return INITIAL_MONSTERS.map((monster, index) => ({
    ...monster,
    x: 2 + Math.floor(seededUnit(seed, index, 2) * (REALM_CARVER_GRID_SIZE - 4)),
    y: 2 + Math.floor(seededUnit(seed, index, 3) * (REALM_CARVER_GRID_SIZE - 4)),
    dx: seededUnit(seed, index, 4) < 0.5 ? -1 : 1,
    dy: 0,
  }));
}

function freezePoint(point: RealmCarverPoint): RealmCarverPoint {
  return Object.freeze({ x: point.x, y: point.y });
}

function freezeGrid(grid: readonly (readonly RealmCarverCellState[])[]): readonly (readonly RealmCarverCellState[])[] {
  return Object.freeze(grid.map((row) => Object.freeze([...row])));
}

function buildWords(input: unknown, seed: number): MutableWord[] {
  const parsed = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsed, "sentence");
  const usedPositions = new Set<string>();
  const words: MutableWord[] = [];
  content.items.forEach((item, sentenceIndex) => {
    const sentenceWords = item.term.trim().split(/\s+/u).filter(Boolean);
    sentenceWords.forEach((term, wordIndex) => {
      const order = words.length;
      if (order >= (REALM_CARVER_GRID_SIZE - 2) ** 2) throw new Error("Realm Carver supports at most 100 sentence words");
      let position = initialWordPosition(seed, order);
      while (usedPositions.has(pointKey(position))) {
        position = {
          x: position.x === REALM_CARVER_GRID_SIZE - 2 ? 1 : position.x + 1,
          y: position.x === REALM_CARVER_GRID_SIZE - 2 ? (position.y === REALM_CARVER_GRID_SIZE - 2 ? 1 : position.y + 1) : position.y,
        };
      }
      usedPositions.add(pointKey(position));
      words.push({
        id: `word:${sentenceIndex}:${wordIndex}`,
        term,
        translation: item.translation,
        order,
        position: { ...position },
        status: "active",
        relocations: 0,
      });
    });
  });
  if (words.length === 0) throw new Error("Realm Carver requires at least one sentence word");
  return words;
}

function resultFor(accountant: ReturnType<typeof createResultAccountant>): GameResults {
  return gameResultsSchema.parse(finalizeResult(accountant, {
    xpPerCorrect: 20,
    xpPerAccuracyPoint: 10,
  }));
}

type RealmCarverActionValues = Omit<RealmCarverActionResult, keyof RealmCarverSnapshot | "snapshot"> & {
  readonly result?: GameResults;
};

function actionResult(
  snapshot: RealmCarverSnapshot,
  values: RealmCarverActionValues,
): RealmCarverActionResult {
  return Object.freeze({ ...snapshot, ...values, snapshot });
}

/** Maps a pointer or touch coordinate to a D-pad direction. */
export function realmCarverDirectionFromPointer(
  pointerX: number,
  pointerY: number,
  sceneWidth: number,
  sceneHeight: number,
): RealmCarverDirection | undefined {
  const centerX = Math.min(100, sceneWidth * 0.14);
  const centerY = sceneHeight * 0.76;
  const horizontalHalf = Math.max(28, Math.min(42, sceneWidth * 0.045));
  const verticalHalf = Math.max(32, Math.min(42, sceneHeight * 0.052));
  const offset = Math.max(48, Math.min(58, sceneHeight * 0.1));

  if (pointerY >= centerY - horizontalHalf && pointerY <= centerY + horizontalHalf) {
    if (pointerX >= centerX - offset - horizontalHalf && pointerX <= centerX - offset + horizontalHalf) return "left";
    if (pointerX >= centerX + offset - horizontalHalf && pointerX <= centerX + offset + horizontalHalf) return "right";
  }
  if (pointerX >= centerX - verticalHalf && pointerX <= centerX + verticalHalf) {
    if (pointerY >= centerY - offset - verticalHalf && pointerY <= centerY - offset + verticalHalf) return "up";
    if (pointerY >= centerY + offset - verticalHalf && pointerY <= centerY + offset + verticalHalf) return "down";
  }
  return undefined;
}

/** Maps a pointer or touch coordinate to a D-pad direction. */
export function getRealmCarverDirectionFromPointer(
  pointerX: number,
  pointerY: number,
  sceneWidth: number,
  sceneHeight: number,
): RealmCarverDirection | undefined {
  return realmCarverDirectionFromPointer(pointerX, pointerY, sceneWidth, sceneHeight);
}

/**
 * Creates the transport-independent Realm Carver territory controller.
 * @param input Sentence content supplied by the host or a test.
 * @param deliver Callback that receives the first terminal result.
 * @param options Deterministic placement and hazard options.
 * @returns A controller for bounded territory gameplay.
 * @throws When sentence content or setup options are invalid.
 */
export function createRealmCarverController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
  options: RealmCarverControllerOptions = {},
): RealmCarverController {
  const sourceSeed = options.seed ?? (options.rng ? options.rng() * 1_000_000 : 0);
  const seed = normalizeSeed(sourceSeed);
  const words = buildWords(input, seed);
  const completion = createCompletionLatch(deliver);
  let accountant = createResultAccountant();
  let grid = createInitialGrid();
  let trail: MutablePoint[] = [];
  let player: RealmCarverPlayerSnapshot = { x: 0, y: 0, hp: 3, maxHp: 3 };
  let monsters: MutableMonster[] = initialMonsters(seed);
  let capturedWordIds: string[] = [];
  let phase: RealmCarverPhase = "playing";
  let targetIndex = 0;
  let lastOutcome: RealmCarverOutcome | undefined;
  let lastEvent: RealmCarverEvent | undefined;
  let gameTime = 0;
  let monsterMotionMs = 0;
  let destroyed = false;
  let terminalResultValue: GameResults | undefined;

  const currentWord = (): MutableWord => words[Math.min(targetIndex, words.length - 1)]!;

  const snapshot = (): RealmCarverSnapshot => Object.freeze({
    seed,
    phase,
    status: phase,
    gridSize: REALM_CARVER_GRID_SIZE,
    grid: freezeGrid(grid),
    player: Object.freeze({ ...player }),
    trail: Object.freeze(trail.map(freezePoint)),
    claimedCells: grid.reduce((count, row) => count + row.filter((cell) => cell === "claimed").length, 0),
    words: Object.freeze(words.map((word) => Object.freeze({
      id: word.id,
      term: word.term,
      translation: word.translation,
      order: word.order,
      position: freezePoint(word.position),
      x: word.position.x,
      y: word.position.y,
      status: word.status,
      relocations: word.relocations,
    }))),
    monsters: Object.freeze(monsters.map((monster) => Object.freeze({ ...monster }))),
    capturedWordIds: Object.freeze([...capturedWordIds]),
    targetIndex,
    targetCount: words.length,
    prompt: phase === "playing" ? currentWord().translation : "",
    answer: phase === "playing" ? currentWord().term : "",
     correctAction: "confirm",
     availableActions: REALM_CARVER_AVAILABLE_ACTIONS,
    hp: player.hp,
    maxHp: player.maxHp,
    lives: player.hp,
    energy: player.hp,
    score: accountant.score,
    correctAnswers: accountant.correctAnswers,
    totalAttempts: accountant.totalAttempts,
    lastOutcome,
    lastEvent,
    gameTime,
    monsterMotionMs,
    destroyed,
    result: terminalResultValue,
  });

  const invalidAction = (event?: RealmCarverEvent): RealmCarverActionResult => actionResult(snapshot(), {
    accepted: false,
    correct: false,
    progressed: false,
    terminal: phase !== "playing",
    completed: phase !== "playing",
    ...(event ? { event } : {}),
    ...(terminalResultValue ? { result: terminalResultValue } : {}),
  });

  const enterDefeat = (): GameResults => {
    phase = "defeat";
    terminalResultValue = resultFor(accountant);
    completion.complete(terminalResultValue);
    return terminalResultValue;
  };

  const enterComplete = (): GameResults => {
    phase = "victory";
    terminalResultValue = resultFor(accountant);
    completion.complete(terminalResultValue);
    return terminalResultValue;
  };

  const resetTrail = (): void => {
    for (const point of trail) {
      if (grid[point.y]?.[point.x] === "trail") grid[point.y]![point.x] = "wild";
    }
    trail = [];
  };

  const damage = (event: "player-trail-collision" | "monster-trail-collision"): RealmCarverActionResult => {
    player = { ...player, hp: Math.max(0, player.hp - 1), x: 0, y: 0 };
    resetTrail();
    lastEvent = event;
    if (player.hp === 0) {
      const result = enterDefeat();
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: true,
        completed: true,
        event,
        result,
      });
    }
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      event,
    });
  };

  const relocate = (word: MutableWord): void => {
    const occupied = new Set(words.filter((candidate) => candidate.status === "active" && candidate.id !== word.id).map((candidate) => pointKey(candidate.position)));
    for (let y = REALM_CARVER_GRID_SIZE - 2; y > 0; y -= 1) {
      for (let x = REALM_CARVER_GRID_SIZE - 2; x > 0; x -= 1) {
        const position = { x, y };
        if (grid[y]?.[x] === "wild" && !occupied.has(pointKey(position))) {
          word.position = position;
          word.relocations += 1;
          return;
        }
      }
    }
    if (isPointInBounds(word.position)) grid[word.position.y]![word.position.x] = "wild";
    word.position = { ...word.position };
    word.relocations += 1;
  };

  const keepActiveWordsReachable = (): void => {
    for (const word of words.filter((candidate) => candidate.status === "active")) {
      if (grid[word.position.y]?.[word.position.x] === "wild") continue;
      const occupied = new Set(words
        .filter((candidate) => candidate.status === "active" && candidate.id !== word.id)
        .map((candidate) => pointKey(candidate.position)));
      let destination: MutablePoint | undefined;
      for (let y = 1; y < REALM_CARVER_GRID_SIZE - 1 && !destination; y += 1) {
        for (let x = 1; x < REALM_CARVER_GRID_SIZE - 1; x += 1) {
          const point = { x, y };
          if (grid[y]?.[x] === "wild" && !occupied.has(pointKey(point))) {
            destination = point;
            break;
          }
        }
      }
      if (destination) {
        word.position = destination;
      } else if (isPointInBounds(word.position)) {
        grid[word.position.y]![word.position.x] = "wild";
      }
    }
  };

  const evaluateCapture = (oldGrid: readonly (readonly RealmCarverCellState[])[]): RealmCarverActionResult | undefined => {
    const candidates = words
      .filter((word) => word.status === "active")
      .filter((word) => oldGrid[word.position.y]?.[word.position.x] !== "claimed" && grid[word.position.y]?.[word.position.x] === "claimed")
      .sort((left, right) => left.order - right.order);
    let captured = false;
    let progressed = false;
    const word = candidates[0];
    if (word?.order === targetIndex) {
      accountant.recordAttempt({ correct: true });
      accountant.addScore(100);
      word.status = "captured";
      capturedWordIds.push(word.id);
      targetIndex += 1;
      captured = true;
      progressed = true;
      lastOutcome = "correct";
      lastEvent = "word-correct";
      if (targetIndex === words.length) {
        const result = enterComplete();
        return actionResult(snapshot(), {
          accepted: true,
          correct: true,
          progressed: true,
          terminal: true,
          completed: true,
          event: "word-correct",
          outcome: "correct",
          result,
        });
      }
    } else if (word) {
      accountant.recordAttempt({ correct: false });
      accountant.addScore(-Math.min(accountant.score, 50));
      lastOutcome = "incorrect";
      lastEvent = "word-wrong";
      relocate(word);
      player = { ...player, hp: Math.max(0, player.hp - 1) };
      if (player.hp === 0) {
        const result = enterDefeat();
        return actionResult(snapshot(), {
          accepted: true,
          correct: false,
          progressed: false,
          terminal: true,
          completed: true,
          event: "word-wrong",
          outcome: "incorrect",
          result,
        });
      }
    }
    keepActiveWordsReachable();
    return actionResult(snapshot(), {
      accepted: true,
      correct: captured,
      progressed,
      terminal: false,
      completed: false,
      event: lastEvent,
      ...(lastOutcome ? { outcome: lastOutcome } : {}),
    });
  };

   const closeTrail = (): RealmCarverActionResult => {
     if (trail.length === 0 || grid[player.y]?.[player.x] !== "claimed") return invalidAction();
     const oldGrid = cloneGrid(grid);
    for (const point of trail) grid[point.y]![point.x] = "claimed";

    const visited = Array.from({ length: REALM_CARVER_GRID_SIZE }, () => Array(REALM_CARVER_GRID_SIZE).fill(false));
    const components: MutablePoint[][] = [];
    for (let y = 0; y < REALM_CARVER_GRID_SIZE; y += 1) {
      for (let x = 0; x < REALM_CARVER_GRID_SIZE; x += 1) {
        if (grid[y]![x] !== "wild" || visited[y]![x]) continue;
        const component: MutablePoint[] = [];
        const queue: MutablePoint[] = [{ x, y }];
        visited[y]![x] = true;
        while (queue.length > 0) {
          const point = queue.shift()!;
          component.push(point);
          for (const direction of ["left", "right", "up", "down"] as const) {
            const delta = directionDelta(direction);
            const next = { x: point.x + delta.x, y: point.y + delta.y };
            if (isPointInBounds(next) && grid[next.y]?.[next.x] === "wild" && !visited[next.y]![next.x]) {
              visited[next.y]![next.x] = true;
              queue.push(next);
            }
          }
        }
        components.push(component);
      }
    }
    const monsterReachable = new Set<string>();
    const monsterQueue: MutablePoint[] = [];
    for (const monster of monsters) {
      if (grid[monster.y]?.[monster.x] !== "wild") continue;
      const key = pointKey(monster);
      if (monsterReachable.has(key)) continue;
      monsterReachable.add(key);
      monsterQueue.push({ x: monster.x, y: monster.y });
    }
    for (let queueIndex = 0; queueIndex < monsterQueue.length; queueIndex += 1) {
      const point = monsterQueue[queueIndex]!;
      for (const direction of ["left", "right", "up", "down"] as const) {
        const delta = directionDelta(direction);
        const next = { x: point.x + delta.x, y: point.y + delta.y };
        const key = pointKey(next);
        if (!isPointInBounds(next) || grid[next.y]?.[next.x] !== "wild" || monsterReachable.has(key)) continue;
        monsterReachable.add(key);
        monsterQueue.push(next);
      }
    }
    for (const component of components) {
      if (component.some((point) => monsterReachable.has(pointKey(point)))) continue;
      for (const point of component) grid[point.y]![point.x] = "claimed";
    }
    trail = [];
    lastEvent = "trail-closed";
    const captureResult = evaluateCapture(oldGrid);
    if (captureResult) return captureResult;
    keepActiveWordsReachable();
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      event: "trail-closed",
    });
  };

  const move = (direction: RealmCarverDirection): RealmCarverActionResult => {
    if (destroyed || phase !== "playing") return invalidAction();
    const delta = directionDelta(direction);
    const destination = { x: player.x + delta.x, y: player.y + delta.y };
    if (!isPointInBounds(destination)) return invalidAction("blocked");
    const destinationCell = grid[destination.y]![destination.x]!;
    player = { ...player, x: destination.x, y: destination.y };
    if (destinationCell === "trail") return damage("player-trail-collision");
    if (destinationCell === "wild") {
      grid[destination.y]![destination.x] = "trail";
      trail.push(destination);
      lastEvent = trail.length === 1 ? "trail-started" : "trail-extended";
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
        event: lastEvent,
      });
    }
    lastEvent = "moved";
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
       event: "moved",
     });
   };

   const confirm = (): RealmCarverActionResult => {
     if (destroyed || phase !== "playing") return invalidAction();
     return closeTrail();
   };

  const tick = (deltaMs: number): RealmCarverActionResult => {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Realm Carver tick requires a nonnegative finite delta");
    if (destroyed || phase !== "playing") return invalidAction();
    const boundedDelta = Math.min(deltaMs, MAX_TICK_DELTA_MS);
    gameTime += boundedDelta;
    monsterMotionMs += boundedDelta;
    while (monsterMotionMs >= 200) {
      monsterMotionMs -= 200;
      for (const monster of monsters) {
        const next = { x: monster.x + monster.dx, y: monster.y + monster.dy };
        if (!isPointInBounds(next) || grid[next.y]![next.x] === "claimed") {
          monster.dx = (monster.dx * -1) as -1 | 0 | 1;
          monster.dy = (monster.dy * -1) as -1 | 0 | 1;
          continue;
        }
        monster.x = next.x;
        monster.y = next.y;
        if (grid[monster.y]![monster.x] === "trail") return damage("monster-trail-collision");
      }
    }
    lastEvent = "moved";
    return actionResult(snapshot(), {
      accepted: false,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      event: "moved",
    });
  };

  const applyHazard = (): RealmCarverActionResult => {
    if (destroyed || phase !== "playing") return invalidAction();
    return damage("monster-trail-collision");
  };

  const validateRestore = (state: RealmCarverSnapshot): void => {
    if (state === null || typeof state !== "object") throw new Error("Realm Carver responsive state must be an object");
    if (state.seed !== seed) throw new Error("Realm Carver responsive seed is invalid");
    if (state.gridSize !== REALM_CARVER_GRID_SIZE || !Array.isArray(state.grid) || state.grid.length !== REALM_CARVER_GRID_SIZE) {
      throw new Error("Realm Carver responsive grid is invalid");
    }
    for (const row of state.grid) {
      if (!Array.isArray(row) || row.length !== REALM_CARVER_GRID_SIZE || row.some((cell) => !["wild", "claimed", "trail"].includes(cell))) {
        throw new Error("Realm Carver responsive cells are invalid");
      }
    }
    if (!(state.phase === "playing" || state.phase === "victory" || state.phase === "defeat")) throw new Error("Realm Carver responsive phase is invalid");
    if (state.status !== state.phase) throw new Error("Realm Carver responsive status is invalid");
    if (completion.hasCompleted && state.phase === "playing") throw new Error("Realm Carver cannot restore active state after completion");
    if (state.targetCount !== words.length || !Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > words.length) throw new Error("Realm Carver responsive target is invalid");
    if (!Number.isInteger(state.player.x) || !Number.isInteger(state.player.y) || !isPointInBounds(state.player)) throw new Error("Realm Carver responsive player is invalid");
    if (!Number.isInteger(state.player.hp) || state.hp !== state.player.hp || state.lives !== state.player.hp || state.energy !== state.player.hp || state.maxHp !== state.player.maxHp || state.player.hp < 0 || state.player.hp > state.player.maxHp || state.player.maxHp !== 3) throw new Error("Realm Carver responsive HP is invalid");
    if (state.phase === "playing" && (state.player.hp === 0 || state.targetIndex === words.length)) throw new Error("Realm Carver playing state is terminal");
    if (state.phase === "victory" && (state.targetIndex !== words.length || state.player.hp === 0)) throw new Error("Realm Carver victory state is incomplete");
    if (state.phase === "defeat" && state.player.hp !== 0) throw new Error("Realm Carver defeat state is incomplete");
    const validatedGrid = state.grid as readonly (readonly RealmCarverCellState[])[];
    const claimedCells = validatedGrid.reduce((count, row) => count + row.filter((cell) => cell === "claimed").length, 0);
    if (state.claimedCells !== claimedCells) throw new Error("Realm Carver responsive claimed-cell counter is invalid");
    for (let index = 0; index < REALM_CARVER_GRID_SIZE; index += 1) {
      if (state.grid[0]?.[index] !== "claimed"
        || state.grid[REALM_CARVER_GRID_SIZE - 1]?.[index] !== "claimed"
        || state.grid[index]?.[0] !== "claimed"
        || state.grid[index]?.[REALM_CARVER_GRID_SIZE - 1] !== "claimed") {
        throw new Error("Realm Carver responsive boundary is invalid");
      }
    }
    if (!Array.isArray(state.trail) || state.trail.some((point) => !isPointInBounds(point) || state.grid[point.y]?.[point.x] !== "trail")) throw new Error("Realm Carver responsive trail is invalid");
    const trailKeys = new Set(state.trail.map(pointKey));
    if (trailKeys.size !== state.trail.length) throw new Error("Realm Carver responsive trail contains duplicates");
    if (!Array.isArray(state.words) || state.words.length !== words.length) throw new Error("Realm Carver responsive words are invalid");
    const wordKeys = new Set<string>();
    for (let index = 0; index < state.words.length; index += 1) {
      const restoredWord = state.words[index]!;
      const expectedWord = words[index]!;
      if (restoredWord.id !== expectedWord.id
        || restoredWord.term !== expectedWord.term
        || restoredWord.translation !== expectedWord.translation
        || restoredWord.order !== expectedWord.order
        || (restoredWord.status !== "active" && restoredWord.status !== "captured")
        || !Number.isInteger(restoredWord.relocations) || restoredWord.relocations < 0
        || !isPointInBounds(restoredWord.position)
        || restoredWord.x !== restoredWord.position.x || restoredWord.y !== restoredWord.position.y) {
        throw new Error("Realm Carver responsive words are inconsistent");
      }
      const key = pointKey(restoredWord.position);
      if (wordKeys.has(key)) throw new Error("Realm Carver responsive word positions are duplicated");
      wordKeys.add(key);
      const expectedStatus = index < state.targetIndex ? "captured" : "active";
      if (restoredWord.status !== expectedStatus) throw new Error("Realm Carver responsive word status is invalid");
      if (restoredWord.status === "active" && state.grid[restoredWord.position.y]?.[restoredWord.position.x] !== "wild") {
        throw new Error("Realm Carver responsive active word is inaccessible");
      }
      if (restoredWord.status === "captured" && state.grid[restoredWord.position.y]?.[restoredWord.position.x] !== "claimed") {
        throw new Error("Realm Carver responsive captured word is not claimed");
      }
    }
    if (!Array.isArray(state.capturedWordIds)
      || state.capturedWordIds.length !== state.targetIndex
      || state.capturedWordIds.some((id, index) => id !== words[index]?.id)) {
      throw new Error("Realm Carver responsive captured words are invalid");
    }
    if (!Array.isArray(state.monsters) || state.monsters.length !== INITIAL_MONSTERS.length) throw new Error("Realm Carver responsive monsters are invalid");
    for (let index = 0; index < state.monsters.length; index += 1) {
      const monster = state.monsters[index]!;
      if (monster.id !== INITIAL_MONSTERS[index]?.id
        || !Number.isInteger(monster.x) || !Number.isInteger(monster.y)
        || !isPointInBounds(monster)
        || ![-1, 0, 1].includes(monster.dx) || ![-1, 0, 1].includes(monster.dy)
        || (monster.dx === 0 && monster.dy === 0)) {
        throw new Error("Realm Carver responsive monster entity is inconsistent");
      }
    }
     if (state.correctAction !== "confirm"
       || state.availableActions.length !== REALM_CARVER_AVAILABLE_ACTIONS.length
       || state.availableActions.some((action, index) => action !== REALM_CARVER_AVAILABLE_ACTIONS[index])) {
      throw new Error("Realm Carver responsive action contract is invalid");
    }
    const restoredTarget = words[Math.min(state.targetIndex, words.length - 1)]!;
    if (state.prompt !== (state.phase === "playing" ? restoredTarget.translation : "")
      || state.answer !== (state.phase === "playing" ? restoredTarget.term : "")) {
      throw new Error("Realm Carver responsive target content is invalid");
    }
    if (state.lastOutcome !== undefined && state.lastOutcome !== "correct" && state.lastOutcome !== "incorrect") {
      throw new Error("Realm Carver responsive outcome is invalid");
    }
    if (state.lastEvent !== undefined && ![
      "moved", "blocked", "trail-started", "trail-extended", "trail-closed", "word-correct", "word-wrong",
      "player-trail-collision", "monster-trail-collision",
    ].includes(state.lastEvent)) throw new Error("Realm Carver responsive event is invalid");
    if (!Number.isInteger(state.correctAnswers) || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts || !Number.isInteger(state.totalAttempts) || state.totalAttempts < 0) throw new Error("Realm Carver responsive counters are invalid");
    if (state.correctAnswers !== state.targetIndex || !Number.isInteger(state.score) || state.score < 0 || state.score > state.correctAnswers * 100) throw new Error("Realm Carver responsive counters are inconsistent");
    if (!Number.isFinite(state.gameTime) || state.gameTime < 0 || !Number.isFinite(state.monsterMotionMs) || state.monsterMotionMs < 0 || state.monsterMotionMs >= 200 || typeof state.destroyed !== "boolean") throw new Error("Realm Carver responsive lifecycle state is invalid");
    const restoredResult = state.result === undefined ? undefined : gameResultsSchema.parse(state.result);
    if (state.phase === "playing" && restoredResult !== undefined) throw new Error("Realm Carver active state has a terminal result");
    if (state.phase !== "playing" && restoredResult === undefined) throw new Error("Realm Carver terminal state has no result");
    if (restoredResult && (restoredResult.correctAnswers !== state.correctAnswers
      || restoredResult.totalAttempts !== state.totalAttempts
      || restoredResult.score !== state.score
      || restoredResult.accuracy !== (state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts)
      || restoredResult.xp !== (state.totalAttempts === 0 ? 0 : Math.floor(state.correctAnswers * 20 + state.correctAnswers / state.totalAttempts * 10)))) {
      throw new Error("Realm Carver terminal result is inconsistent");
    }
  };

  return Object.freeze({
     snapshot,
     move,
     confirm,
     choose(action: InputActionId): RealmCarverActionResult {
       if (action === "confirm") return confirm();
       const direction = directionForAction(action);
      return direction ? move(direction) : invalidAction();
    },
    tick,
    applyHazard,
    capture: snapshot,
    restore(state: RealmCarverSnapshot): void {
      if (destroyed) return;
      validateRestore(state);
      grid = cloneGrid(state.grid);
      trail = state.trail.map((point) => ({ x: point.x, y: point.y }));
      player = { ...state.player };
      words.splice(0, words.length, ...state.words.map((word) => ({
        id: word.id,
        term: word.term,
        translation: word.translation,
        order: word.order,
        position: { ...word.position },
        status: word.status,
        relocations: word.relocations,
      })));
      monsters = state.monsters.map((monster) => ({ ...monster }));
      capturedWordIds = [...state.capturedWordIds];
      targetIndex = state.targetIndex;
      phase = state.phase;
      lastOutcome = state.lastOutcome;
      lastEvent = state.lastEvent;
      gameTime = state.gameTime;
      monsterMotionMs = state.monsterMotionMs;
      terminalResultValue = state.result === undefined ? undefined : gameResultsSchema.parse(state.result);
      accountant = createResultAccountant();
      for (let index = 0; index < state.totalAttempts; index += 1) accountant.recordAttempt({ correct: index < state.correctAnswers });
      accountant.addScore(state.score);
      if (state.phase !== "playing" || state.destroyed) completion.sealWithoutDelivery();
      destroyed = state.destroyed;
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

function createScene(context: RealmCarverSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  const normalize = createInputActionNormalizer({ keyboard: KEYBOARD_BINDINGS, pointerTap: { action: "confirm" } });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    if (context.sessionMode === "playing") context.controller.tick(deltaMs);
  });

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? REALM_CARVER_CANVAS.width,
    height: scene.scale?.height ?? REALM_CARVER_CANVAS.height,
  });

  const pointerPosition = (scene: PhaserSceneLike, x: number, y: number): RealmCarverPoint => {
    const { width, height } = dimensions(scene);
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0) return { x, y };
    return {
      x: (x - rect.left) * (width / rect.width),
      y: (y - (rect.top ?? 0)) * (rect.height && rect.height > 0 ? height / rect.height : 1),
    };
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const activeResources = resources;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const boardSize = Math.min(width * 0.62, height * 0.67);
    const boardX = width - boardSize - width * 0.055;
    const boardY = height * 0.18;
    const cellSize = boardSize / REALM_CARVER_GRID_SIZE;
    const centerX = Math.min(100, width * 0.14);
    const centerY = height * 0.76;
    const dpadSize = Math.max(28, Math.min(42, width * 0.045));
    const dpadOffset = Math.max(48, Math.min(58, height * 0.1));

    activeResources.graphics.clear();
    if (!activeResources.art.ground("world:ground", width, height)) activeResources.graphics.fillStyle(0x08111f, 1).fillRect(0, 0, width, height);
    activeResources.graphics.fillStyle(0x12243a, 1).fillRoundedRect(boardX - 10, boardY - 10, boardSize + 20, boardSize + 20, 18);
    for (let y = 0; y < REALM_CARVER_GRID_SIZE; y += 1) {
      for (let x = 0; x < REALM_CARVER_GRID_SIZE; x += 1) {
        const cell = state.grid[y]![x]!;
        const color = cell === "claimed" ? 0x245a63 : cell === "trail" ? 0xf59e0b : 0x17283d;
        activeResources.graphics.fillStyle(color, cell === "trail" ? 1 : 0.95)
          .fillRect(boardX + x * cellSize, boardY + y * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
    state.monsters.forEach((monster, index) => {
      const monsterX = boardX + (monster.x + 0.5) * cellSize;
      const monsterY = boardY + (monster.y + 0.5) * cellSize;
      if (activeResources.art.place(`monster:${index}`, "enemy:idle", {
        x: monsterX,
        y: monsterY,
        width: Math.max(12, cellSize * 0.9),
        depth: 7,
      })) return;
      activeResources.graphics.fillStyle(0xef4444, 1)
        .fillCircle(monsterX, monsterY, Math.max(5, cellSize * 0.24));
    });
    for (const word of state.words) {
      if (word.status === "captured") continue;
      activeResources.graphics.fillStyle(word.order === state.targetIndex ? 0xfbbf24 : 0xa78bfa, 1)
        .fillCircle(boardX + (word.position.x + 0.5) * cellSize, boardY + (word.position.y + 0.5) * cellSize, Math.max(5, cellSize * 0.22));
    }
    const playerX = boardX + (state.player.x + 0.5) * cellSize;
    const playerY = boardY + (state.player.y + 0.5) * cellSize;
    if (!activeResources.art.place("player", "player:idle", {
      x: playerX,
      y: playerY,
      width: Math.max(14, cellSize * 1.05),
      depth: 8,
    })) {
      activeResources.graphics.fillStyle(0xfef3c7, 1)
        .fillCircle(playerX, playerY, Math.max(6, cellSize * 0.28));
    }
    activeResources.art.sweep();

    activeResources.graphics.fillStyle(0x29415c, 0.95).fillRoundedRect(centerX - dpadSize, centerY - dpadSize, dpadSize * 2, dpadSize * 2, 12);
    activeResources.graphics.fillRoundedRect(centerX - dpadOffset - dpadSize, centerY - dpadSize, dpadSize * 2, dpadSize * 2, 12);
    activeResources.graphics.fillRoundedRect(centerX + dpadOffset - dpadSize, centerY - dpadSize, dpadSize * 2, dpadSize * 2, 12);
    activeResources.graphics.fillRoundedRect(centerX - dpadSize, centerY - dpadOffset - dpadSize, dpadSize * 2, dpadSize * 2, 12);
    activeResources.graphics.fillRoundedRect(centerX - dpadSize, centerY + dpadOffset - dpadSize, dpadSize * 2, dpadSize * 2, 12);
    activeResources.graphics.lineStyle(2, 0x93c5fd, 0.8).strokeRoundedRect(boardX, boardY, boardSize, boardSize, 8);

    activeResources.title.setText("REALM CARVER").setPosition(28, 22);
    activeResources.prompt.setText(`Enclose: ${state.prompt}  →  ${state.answer}`).setPosition(28, 72);
    activeResources.hud.setText(`${composition?.profile === "compact" ? "Compact" : "Wide"}  |  Words ${state.targetIndex}/${state.targetCount}  |  HP ${state.player.hp}/${state.player.maxHp}  |  Score ${state.score}`).setPosition(28, 112);
    activeResources.feedback.setText(state.phase === "victory" ? "The realm is fully carved." : state.phase === "defeat" ? "The wild magic took the realm." : state.lastOutcome === "incorrect" ? "That word returned to the wild." : "Draw a loop, return to claimed ground, then confirm.").setPosition(28, height - 72);
    activeResources.instructions.setText("Keyboard: W A S D / Arrow keys to draw  •  Space or Enter to confirm  •  Touch D-pad or tap").setPosition(28, height - 40);
    activeResources.dpadUp.setText("▲").setPosition(centerX - 8, centerY - dpadOffset - 12);
    activeResources.dpadLeft.setText("◀").setPosition(centerX - dpadOffset - 10, centerY - 12);
    activeResources.dpadDown.setText("▼").setPosition(centerX - 8, centerY + dpadOffset - 12);
    activeResources.dpadRight.setText("▶").setPosition(centerX + dpadOffset - 8, centerY - 12);
    state.words.forEach((word, index) => {
      activeResources.wordLabels[index]?.setText(word.status === "captured" ? "✓" : word.term)
        .setPosition(boardX + (word.position.x + 0.5) * cellSize - 18, boardY + (word.position.y + 0.5) * cellSize + 10);
    });
  };

  const processAction = (action: InputActionId): void => {
    const before = context.controller.snapshot();
    context.controller.choose(action);
    const after = context.controller.snapshot();
    if (before.lastEvent === after.lastEvent && before.targetIndex === after.targetIndex && before.player.hp === after.player.hp) return;
    context.diagnostic({
      level: "info",
      code: after.phase === "victory" || after.phase === "defeat" ? "REALM_CARVER_TERMINAL" : "REALM_CARVER_ACTION",
      message: "Realm Carver processed territory input.",
      details: { phase: after.phase, event: after.lastEvent, targetIndex: after.targetIndex },
    });
  };

  const cleanup = (): void => {
    if (!resources) return;
    const activeResources = resources;
    resources = undefined;
    frameScheduler.cancel();
    context.inputController.cancelActiveGesture();
    context.controller.destroy();
    activeResources.graphics.destroy();
    activeResources.title.destroy();
    activeResources.prompt.destroy();
    activeResources.hud.destroy();
    activeResources.feedback.destroy();
    activeResources.instructions.destroy();
    activeResources.dpadUp.destroy();
    activeResources.dpadLeft.destroy();
    activeResources.dpadDown.destroy();
    activeResources.dpadRight.destroy();
    for (const label of activeResources.wordLabels) label.destroy();
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
    if (!this.add) throw new Error("Realm Carver requires Phaser display services");
    const style = { fontFamily: "Arial", color: "#f8fafc", fontSize: "18px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(0, 0, "", { ...style, fontSize: "30px", fontStyle: "bold" }),
      prompt: this.add.text(0, 0, "", { ...style, fontSize: "23px" }),
      hud: this.add.text(0, 0, "", { ...style, fontSize: "16px", color: "#bfdbfe" }),
      feedback: this.add.text(0, 0, "", { ...style, fontSize: "17px", color: "#fde68a" }),
      instructions: this.add.text(0, 0, "", { ...style, fontSize: "14px", color: "#cbd5e1" }),
      dpadUp: this.add.text(0, 0, "", { ...style, fontSize: "20px" }),
      dpadLeft: this.add.text(0, 0, "", { ...style, fontSize: "20px" }),
      dpadDown: this.add.text(0, 0, "", { ...style, fontSize: "20px" }),
      dpadRight: this.add.text(0, 0, "", { ...style, fontSize: "20px" }),
      wordLabels: context.controller.snapshot().words.map(() => this.add!.text(0, 0, "", { ...style, fontSize: "12px" })),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources) return;
    frameScheduler.tick(Math.max(0, delta));
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action) processAction(action);
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const local = pointerPosition(this, input.pointer.x, input.pointer.y);
        const direction = realmCarverDirectionFromPointer(local.x, local.y, dimensions(this).width, dimensions(this).height);
        if (direction) {
          processAction(actionForDirection(direction));
        } else if (normalize({ modality: "pointer", phase: "up", x: local.x, y: local.y })[0]?.action === "confirm") {
          processAction("confirm");
        }
      }
    }
    updateView(this);
  };

  return {
    key: REALM_CARVER_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Realm Carver responsive state is invalid");
        context.controller.restore(state as RealmCarverSnapshot);
      },
      apkRecompose: (nextComposition: RealmCarverSceneContext["composition"]) => {
        composition = nextComposition;
      },
    },
  };
}

function appendTutorialSegment(
  path: RealmCarverDirection[],
  from: RealmCarverPoint,
  to: RealmCarverPoint,
): void {
  const horizontal = to.x > from.x ? "right" : "left";
  const vertical = to.y > from.y ? "down" : "up";
  for (let x = from.x; x !== to.x; x += to.x > from.x ? 1 : -1) path.push(horizontal);
  for (let y = from.y; y !== to.y; y += to.y > from.y ? 1 : -1) path.push(vertical);
}

function tutorialPathFromCorner(
  corner: RealmCarverPoint,
  left: number,
  top: number,
  right: number,
  bottom: number,
): RealmCarverDirection[] {
  const points: readonly RealmCarverPoint[] = corner.x === 0 && corner.y === 0
    ? [{ x: left, y: 0 }, { x: left, y: bottom }, { x: right, y: bottom }, { x: right, y: top }, { x: REALM_CARVER_GRID_SIZE - 1, y: top }]
    : corner.x === REALM_CARVER_GRID_SIZE - 1 && corner.y === 0
      ? [{ x: right, y: 0 }, { x: right, y: bottom }, { x: left, y: bottom }, { x: left, y: top }, { x: 0, y: top }]
      : corner.x === 0
        ? [{ x: left, y: REALM_CARVER_GRID_SIZE - 1 }, { x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: REALM_CARVER_GRID_SIZE - 1, y: bottom }]
        : [{ x: right, y: REALM_CARVER_GRID_SIZE - 1 }, { x: right, y: top }, { x: left, y: top }, { x: left, y: bottom }, { x: 0, y: bottom }];
  const path: RealmCarverDirection[] = [];
  let current = corner;
  for (const point of points) {
    appendTutorialSegment(path, current, point);
    current = point;
  }
  return path;
}

function directionsToBoundaryCorner(
  player: RealmCarverPoint,
  corner: RealmCarverPoint,
): RealmCarverDirection[] | undefined {
  const path: RealmCarverDirection[] = [];
  let current = { ...player };
  if (current.x !== 0 && current.x !== REALM_CARVER_GRID_SIZE - 1
    && current.y !== 0 && current.y !== REALM_CARVER_GRID_SIZE - 1) return undefined;
  if (current.x === 0 || current.x === REALM_CARVER_GRID_SIZE - 1) {
    appendTutorialSegment(path, current, { x: current.x, y: corner.y });
    current = { x: current.x, y: corner.y };
    appendTutorialSegment(path, current, corner);
  } else {
    appendTutorialSegment(path, current, { x: corner.x, y: current.y });
    current = { x: corner.x, y: current.y };
    appendTutorialSegment(path, current, corner);
  }
  return path;
}

function tutorialLoopPaths(
  state: RealmCarverSnapshot,
  target: RealmCarverPoint,
  correct: boolean,
): readonly RealmCarverDirection[][] {
  const leftValues = [...new Set([Math.max(1, target.x - 2), Math.max(1, target.x - 1), target.x])];
  const rightValues = [...new Set([target.x, Math.min(REALM_CARVER_GRID_SIZE - 2, target.x + 1), Math.min(REALM_CARVER_GRID_SIZE - 2, target.x + 2)])];
  const topValues = [...new Set([Math.max(1, target.y - 2), Math.max(1, target.y - 1), target.y])];
  const bottomValues = [...new Set([target.y, Math.min(REALM_CARVER_GRID_SIZE - 2, target.y + 1), Math.min(REALM_CARVER_GRID_SIZE - 2, target.y + 2)])];
  const corners: readonly RealmCarverPoint[] = correct
    ? [
      { x: REALM_CARVER_GRID_SIZE - 1, y: 0 },
      { x: 0, y: 0 },
      { x: REALM_CARVER_GRID_SIZE - 1, y: REALM_CARVER_GRID_SIZE - 1 },
      { x: 0, y: REALM_CARVER_GRID_SIZE - 1 },
    ]
    : [
      { x: 0, y: REALM_CARVER_GRID_SIZE - 1 },
      { x: REALM_CARVER_GRID_SIZE - 1, y: REALM_CARVER_GRID_SIZE - 1 },
      { x: 0, y: 0 },
      { x: REALM_CARVER_GRID_SIZE - 1, y: 0 },
    ];
  const paths: RealmCarverDirection[][] = [];
  for (const corner of corners) {
    const prefix = directionsToBoundaryCorner(state.player, corner);
    if (!prefix) continue;
    for (const left of leftValues) {
      for (const right of rightValues) {
        for (const top of topValues) {
          for (const bottom of bottomValues) {
            if (left > right || top > bottom) continue;
            paths.push([...prefix, ...tutorialPathFromCorner(corner, left, top, right, bottom)]);
          }
        }
      }
    }
  }
  return paths;
}

function tutorialTargetPoint(
  state: RealmCarverSnapshot,
  correct: boolean,
): RealmCarverPoint | undefined {
  const targetIndex = correct ? state.targetIndex : state.targetIndex + 1;
  const target = state.words.find((word) => word.order === targetIndex && word.status === "active");
  if (target) return target.position;
  if (correct) return undefined;
  for (let y = 1; y < REALM_CARVER_GRID_SIZE - 1; y += 1) {
    for (let x = 1; x < REALM_CARVER_GRID_SIZE - 1; x += 1) {
      if (state.grid[y]?.[x] === "wild" && !state.words.some((word) => word.status === "active" && word.x === x && word.y === y)) return { x, y };
    }
  }
  return undefined;
}

function executeTutorialLoop(
  controller: RealmCarverController,
  correct: boolean,
): void {
  const baseline = controller.capture();
  const target = tutorialTargetPoint(baseline, correct);
  if (!target) return;
  const paths = tutorialLoopPaths(baseline, target, correct);
  for (const path of paths) {
    controller.restore(baseline);
    for (const direction of path) controller.move(direction);
    const result = controller.confirm();
    if ((correct && result.outcome === "correct") || (!correct && result.outcome === "incorrect")) return;
    if (result.snapshot.phase !== "playing") return;
  }
  controller.restore(baseline);
  for (const direction of paths[0] ?? []) controller.move(direction);
  controller.confirm();
}

/** Creates the standard APK cartridge for the Realm Carver territory session. */
export function createRealmCarverCartridge(): StandardExperienceCartridge {
  let activeController: RealmCarverController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: REALM_CARVER_ID,
    title: "Realm Carver",
    description: "Carve safe territory through wild magic and capture sentence words in order.",
    inputMode: "sentence",
    objective: "Capture every ordered sentence word before the realm loses its health.",
    mechanicInstruction: "Move in four directions, draw a trail outside claimed land, and return to close the circuit.",
    keyboardKeys: ["W", "A", "S", "D", "Arrow keys", "Space / Enter"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      executeTutorialLoop(controller, actionId === "action:select-correct");
    },
  });

  return {
    manifest: {
      id: REALM_CARVER_ID,
      title: "Realm Carver",
      description: "Carve safe territory through wild magic and capture sentence words in order.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["realm-carver/player-carver"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:language-target-progression",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:bounded-territory-grid",
        "capability:territory-trail-capture",
        "capability:monster-trail-hazard",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createRealmCarverController(
        input,
        sessionMode === "playing"
          ? (result) => context.complete(result, controller.snapshot().phase === "victory" ? "victory" : "defeat")
          : () => undefined,
        { seed: context.seed },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "REALM_CARVER_READY",
        message: "Realm Carver territory controller is ready.",
        details: { cartridgeId: "realm-carver", editionId: context.edition.id, targetCount: controller.snapshot().targetCount },
      });
      return {
        width: REALM_CARVER_CANVAS.width,
        height: REALM_CARVER_CANVAS.height,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
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
