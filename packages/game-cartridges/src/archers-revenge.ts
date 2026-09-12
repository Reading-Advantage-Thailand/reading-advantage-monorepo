import {
  gameResultsSchema,
  vocabularyInputSchema,
  type GameResults,
  type VocabularyItem,
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
  type GameTerminalOutcome,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for the Archer's Revenge cartridge. */
export const ARCHERS_REVENGE_ID = "archers-revenge" as const;

/** Canonical scene size before the APK host applies responsive scaling. */
export const ARCHERS_REVENGE_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Legacy aliases retained for hosts that use the former portrait constants. */
export const GAME_WIDTH = ARCHERS_REVENGE_CANVAS.width;
export const GAME_HEIGHT = ARCHERS_REVENGE_CANVAS.height;

/** Number of enemy columns in every Archer's Revenge formation. */
export const ARCHERS_REVENGE_COLUMNS = 5;

/** Number of enemy rows in every Archer's Revenge formation. */
export const ARCHERS_REVENGE_ROWS = 3;

/** Number of enemies resolved in one wave. */
export const ARCHERS_REVENGE_ENEMIES_PER_WAVE = ARCHERS_REVENGE_COLUMNS * ARCHERS_REVENGE_ROWS;

/** Keyboard bindings for left/right aiming and arrow fire. */
export const ARCHERS_REVENGE_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  Space: "confirm",
  Enter: "confirm",
});

/** Semantic actions accepted by the shared Archer's Revenge controller. */
export const ARCHERS_REVENGE_AVAILABLE_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-left",
  "move-right",
  "confirm",
]);

/** Active or terminal phase in an Archer's Revenge session. */
export type ArchersRevengePhase = "playing" | "victory" | "defeat";

/** One enemy in the three-row, five-column formation. */
export interface ArchersRevengeEnemy {
  /** Stable enemy identity within the current wave. */
  readonly id: string;
  /** Zero-based formation row. */
  readonly row: number;
  /** Zero-based formation column. */
  readonly column: number;
  /** Canonical scene-space horizontal position. */
  readonly x: number;
  /** Canonical scene-space vertical position. */
  readonly y: number;
  /** Source-language vocabulary term represented by this enemy. */
  readonly term: string;
  /** Translation displayed below this enemy. */
  readonly translation: string;
  /** Whether this enemy is a shielded distractor. */
  readonly shielded: boolean;
  /** Historical name for the shield state. */
  readonly shieldUp: boolean;
}

/** One player arrow travelling toward the formation. */
export interface ArchersRevengeArrow {
  /** Stable arrow identity. */
  readonly id: string;
  /** Column selected when the arrow was fired. */
  readonly column: number;
  /** Canonical scene-space horizontal position. */
  readonly x: number;
  /** Canonical scene-space vertical position. */
  readonly y: number;
}

/** One enemy projectile travelling toward the player. */
export interface ArchersRevengeProjectile {
  /** Stable projectile identity. */
  readonly id: string;
  /** Column that fired the projectile. */
  readonly column: number;
  /** Canonical scene-space horizontal position. */
  readonly x: number;
  /** Canonical scene-space vertical position. */
  readonly y: number;
}

/** Current vocabulary target shown above the formation. */
export interface ArchersRevengeTarget {
  /** English source term for the active Thai target. */
  readonly term: string;
  /** Thai translation shown as the learning target. */
  readonly translation: string;
  /** Column containing the unshielded enemy. */
  readonly column: number;
}

/** Immutable state exposed by the Archer's Revenge rules and scene. */
export interface ArchersRevengeSnapshot {
  /** Deterministic seed used for formations, targets, and projectile order. */
  readonly seed: number;
  /** Current session phase. */
  readonly phase: ArchersRevengePhase;
  /** Historical status alias for the active or terminal phase. */
  readonly status: ArchersRevengePhase;
  /** One-based wave number during play. */
  readonly wave: number;
  /** Finite number of formations required for victory. */
  readonly maxWaves: number;
  /** Index of the next correct shot across all waves. */
  readonly targetIndex: number;
  /** Total correct shots required across all waves. */
  readonly targetCount: number;
  /** Current prompt and vulnerable column. */
  readonly target: ArchersRevengeTarget;
  /** Thai learning prompt retained as a compact renderer field. */
  readonly prompt: string;
  /** English answer required by the current target. */
  readonly answer: string;
  /** Semantic action used to fire at the selected target. */
  readonly correctAction: InputActionId;
  /** Semantic actions currently accepted by the shared controller. */
  readonly availableActions: readonly InputActionId[];
  /** Current vocabulary target retained as a legacy-compatible field. */
  readonly targetWord: VocabularyItem;
  /** Current three-row, five-column enemy formation. */
  readonly enemies: readonly ArchersRevengeEnemy[];
  /** Player column selected for the next arrow. */
  readonly aimColumn: number;
  /** Canonical horizontal player position. */
  readonly playerX: number;
  /** Player health. */
  readonly hp: number;
  /** Player health represented by the shared controller contract. */
  readonly lives: number;
  /** Energy represented by the shared controller contract. */
  readonly energy: number;
  /** Starting player health. */
  readonly maxHp: number;
  /** Current score. */
  readonly score: number;
  /** Consecutive correct collision count. */
  readonly combo: number;
  /** Active player arrows. */
  readonly arrows: readonly ArchersRevengeArrow[];
  /** Active enemy projectiles. */
  readonly enemyProjectiles: readonly ArchersRevengeProjectile[];
  /** Number of correct vocabulary collisions. */
  readonly correctAnswers: number;
  /** Number of enemy collisions that counted as attempts. */
  readonly totalAttempts: number;
  /** Number of incorrect shielded collisions. */
  readonly wrongAnswers: number;
  /** Feedback from the latest resolved enemy collision. */
  readonly lastOutcome?: "correct" | "incorrect";
  /** First terminal result, when the session has ended. */
  readonly result?: GameResults;
  /** Elapsed simulation time. */
  readonly gameTime: number;
  /** Timestamp of the most recent arrow fire. */
  readonly lastFireTime: number;
  /** Remaining time before the deterministic target rotation. */
  readonly targetChangeTimer: number;
  /** Fixed interval between deterministic target rotations. */
  readonly targetChangeIntervalMs: number;
  /** Number of timed target rotations already applied. */
  readonly targetChangeCount: number;
  /** Current horizontal formation offset. */
  readonly formationOffset: number;
  /** Current horizontal formation direction. */
  readonly formationDirection: -1 | 1;
  /** Whether the controller has been sealed by scene cleanup. */
  readonly destroyed: boolean;
}

/** Optional deterministic tuning for controller tests and host replays. */
export interface ArchersRevengeControllerOptions {
  /** Seed used to select target columns and distractor content. */
  readonly seed?: number;
  /** Number of formations required for victory. */
  readonly maxWaves?: number;
  /** Starting player health. */
  readonly maxHp?: number;
  /** Arrow travel speed in canonical pixels per second. */
  readonly arrowSpeed?: number;
  /** Enemy projectile travel speed in canonical pixels per second. */
  readonly projectileSpeed?: number;
  /** Formation descent speed in canonical pixels per second. */
  readonly formationDescendSpeed?: number;
  /** Formation horizontal speed in canonical pixels per second. */
  readonly formationSpeed?: number;
  /** Maximum horizontal formation offset before reversal. */
  readonly formationTravel?: number;
  /** Milliseconds between deterministic target changes. */
  readonly targetChangeIntervalMs?: number;
}

/** Result returned after changing the player's aim. */
export interface ArchersRevengeAimResult {
  /** Whether the aim request was accepted. */
  readonly accepted: boolean;
  /** Bounded column selected after the request. */
  readonly column: number;
  /** State after applying the request. */
  readonly snapshot: ArchersRevengeSnapshot;
}

/** Result returned after one shared semantic controller action. */
export interface ArchersRevengeChooseResult {
  /** Whether the action changed the active session. */
  readonly accepted: boolean;
  /** Whether the action resolved a correct target. */
  readonly correct: boolean;
  /** Whether the action advanced the learning target. */
  readonly progressed: boolean;
  /** Whether the action entered a terminal phase. */
  readonly terminal: boolean;
  /** Alias retained by the shared cartridge contract. */
  readonly completed: boolean;
  /** First terminal result while the session has ended. */
  readonly result?: GameResults;
  /** State after applying the action. */
  readonly snapshot: ArchersRevengeSnapshot;
}

/** Result returned after firing one arrow. */
export interface ArchersRevengeFireResult {
  /** Whether the arrow was created. */
  readonly accepted: boolean;
  /** Whether this call reached a correct target immediately. */
  readonly correct: false;
  /** Whether a vocabulary target advanced during this call. */
  readonly progressed: false;
  /** Whether this call reached a terminal state. */
  readonly terminal: false;
  /** Whether this call completed the session. */
  readonly completed: false;
  /** Created arrow identity when accepted. */
  readonly arrowId?: string;
  /** State after applying the request. */
  readonly snapshot: ArchersRevengeSnapshot;
}

/** One arrow collision resolved by a simulation tick. */
export interface ArchersRevengeArrowHit {
  /** Enemy identity reached by the arrow. */
  readonly enemyId: string;
  /** Whether the enemy was the unshielded vocabulary target. */
  readonly correct: boolean;
}

/** Result returned after advancing the shooter simulation. */
export interface ArchersRevengeTickResult {
  /** Arrow collisions resolved during the tick. */
  readonly arrowHits: readonly ArchersRevengeArrowHit[];
  /** Number of enemy projectiles that hit the player. */
  readonly projectileHits: number;
  /** Whether the formation crossed the player line during the tick. */
  readonly breached: boolean;
  /** Whether this tick entered victory or defeat. */
  readonly terminal: boolean;
  /** First terminal result produced by this tick. */
  readonly result?: GameResults;
  /** State after applying the tick. */
  readonly snapshot: ArchersRevengeSnapshot;
}

/** Transport-independent Archer's Revenge rules and lifecycle controls. */
export interface ArchersRevengeController {
  /** Returns the current immutable shooter state. */
  snapshot(): ArchersRevengeSnapshot;
  /** Applies one shared semantic movement or fire action. */
  choose(action: InputActionId): ArchersRevengeChooseResult;
  /** Triggers one deterministic enemy-fire hazard without changing the target. */
  applyHazard(): ArchersRevengeChooseResult;
  /** Moves the player aim to one bounded formation column. */
  aimColumn(column: number): ArchersRevengeAimResult;
  /** Maps a pointer coordinate to a column and moves the player aim. */
  aimPointer(pointerX: number, sceneWidth: number): ArchersRevengeAimResult;
  /** Creates one travelling arrow from the current aim. */
  fire(column?: number): ArchersRevengeFireResult;
  /** Advances arrows, projectiles, formation descent, and terminal rules. */
  tick(deltaMs: number): ArchersRevengeTickResult;
  /** Captures state before a responsive scene reflow. */
  capture(): ArchersRevengeSnapshot;
  /** Restores validated state after a responsive scene reflow. */
  restore(snapshot: ArchersRevengeSnapshot): void;
  /** Seals the session and releases future completion delivery. */
  destroy(): void;
}

type MutableEnemy = ArchersRevengeEnemy;
type MutableArrow = ArchersRevengeArrow;
type MutableProjectile = ArchersRevengeProjectile;

interface ResolvedOptions {
  readonly seed: number;
  readonly maxWaves: number;
  readonly maxHp: number;
  readonly arrowSpeed: number;
  readonly projectileSpeed: number;
  readonly formationDescendSpeed: number;
  readonly formationSpeed: number;
  readonly formationTravel: number;
  readonly targetChangeIntervalMs: number;
}

interface Formation {
  readonly enemies: MutableEnemy[];
  readonly target: ArchersRevengeTarget;
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
  readonly width?: number;
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  setFontSize?(value: number): this;
  setBackgroundColor?(value: string): this;
  setPadding?(left: number, top: number, right?: number, bottom?: number): this;
  setOrigin?(x: number, y?: number): this;
  setWordWrapWidth?(width: number, useAdvancedWrap?: boolean): this;
  destroy(): void;
}

/**
 * Keeps one measured frontline label inside its visible aim lane.
 * @param enemyX Current rendered enemy center.
 * @param column Stable aim column for the enemy.
 * @param labelWidth Measured wrapped label width.
 * @param sceneWidth Current scene width.
 * @returns A visible label center that cannot overlap an adjacent lane.
 */
export function clampArchersRevengeLabelX(
  enemyX: number,
  column: number,
  labelWidth: number,
  sceneWidth: number,
): number {
  const laneWidth = sceneWidth / ARCHERS_REVENGE_COLUMNS;
  const halfWidth = Math.min(Math.max(0, labelWidth) / 2, laneWidth / 2 - 6);
  const laneLeft = column * laneWidth + 6;
  const laneRight = (column + 1) * laneWidth - 6;
  return clamp(enemyX, laneLeft + halfWidth, laneRight - halfWidth);
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
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly enemyLabels: readonly PhaserTextLike[];
}

interface SceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: ArchersRevengeController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
}

const PLAYER_Y = 480;
const ENEMY_START_Y = 145;
const ENEMY_ROW_GAP = 60;
const ENEMY_WIDTH = 130;
const ENEMY_HEIGHT = 54;
const COLUMN_PADDING = 100;
const ARROW_START_OFFSET = 26;
const ARROW_COOLDOWN_MS = 160;
const DEFAULT_MAX_WAVES = 3;
const DEFAULT_MAX_HP = 3;
const DEFAULT_ARROW_SPEED = 520;
const DEFAULT_PROJECTILE_SPEED = 220;
const DEFAULT_FORMATION_DESCEND_SPEED = 2;
const DEFAULT_FORMATION_SPEED = 35;
const DEFAULT_FORMATION_TRAVEL = 60;
const DEFAULT_TARGET_CHANGE_INTERVAL_MS = 7_000;
const BREACH_Y = PLAYER_Y - 58;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function integerOption(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved <= 0) throw new Error(`${label} must be a positive integer`);
  return resolved;
}

function finitePositiveOption(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) throw new Error(`${label} must be positive`);
  return resolved;
}

function finiteNonNegativeOption(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved < 0) throw new Error(`${label} must be nonnegative`);
  return resolved;
}

function resolveOptions(options: ArchersRevengeControllerOptions, targetCount: number): ResolvedOptions {
  if (options.seed !== undefined && (!Number.isInteger(options.seed) || options.seed < 0)) {
    throw new Error("Archer's Revenge seed must be a nonnegative integer");
  }
  const minimumWaves = Math.max(1, Math.ceil(targetCount / ARCHERS_REVENGE_ENEMIES_PER_WAVE));
  const requestedWaves = integerOption(options.maxWaves, DEFAULT_MAX_WAVES, "Archer's Revenge maxWaves");
  return Object.freeze({
    seed: options.seed ?? 0,
    maxWaves: Math.max(minimumWaves, requestedWaves),
    maxHp: integerOption(options.maxHp, DEFAULT_MAX_HP, "Archer's Revenge maxHp"),
    arrowSpeed: finitePositiveOption(options.arrowSpeed, DEFAULT_ARROW_SPEED, "Archer's Revenge arrowSpeed"),
    projectileSpeed: finitePositiveOption(options.projectileSpeed, DEFAULT_PROJECTILE_SPEED, "Archer's Revenge projectileSpeed"),
    formationDescendSpeed: finiteNonNegativeOption(
      options.formationDescendSpeed,
      DEFAULT_FORMATION_DESCEND_SPEED,
      "Archer's Revenge formationDescendSpeed",
    ),
    formationSpeed: finiteNonNegativeOption(options.formationSpeed, DEFAULT_FORMATION_SPEED, "Archer's Revenge formationSpeed"),
    formationTravel: finitePositiveOption(options.formationTravel, DEFAULT_FORMATION_TRAVEL, "Archer's Revenge formationTravel"),
    targetChangeIntervalMs: finitePositiveOption(
      options.targetChangeIntervalMs,
      DEFAULT_TARGET_CHANGE_INTERVAL_MS,
      "Archer's Revenge targetChangeIntervalMs",
    ),
  });
}

function columnX(column: number): number {
  const usableWidth = ARCHERS_REVENGE_CANVAS.width - COLUMN_PADDING * 2;
  return COLUMN_PADDING + column * (usableWidth / (ARCHERS_REVENGE_COLUMNS - 1));
}

function segmentContains(start: number, end: number, point: number, tolerance: number): boolean {
  return Math.min(start, end) - tolerance <= point && point <= Math.max(start, end) + tolerance;
}

function distanceToSegment(point: number, start: number, end: number): number {
  if (segmentContains(start, end, point, 0)) return 0;
  return Math.min(Math.abs(point - start), Math.abs(point - end));
}

function freezeEnemy(enemy: MutableEnemy): ArchersRevengeEnemy {
  return Object.freeze({ ...enemy });
}

function freezeArrow(arrow: MutableArrow): ArchersRevengeArrow {
  return Object.freeze({ ...arrow });
}

function freezeProjectile(projectile: MutableProjectile): ArchersRevengeProjectile {
  return Object.freeze({ ...projectile });
}

function freezeSnapshot(
  state: {
    seed: number;
    phase: ArchersRevengePhase;
    wave: number;
    maxWaves: number;
    targetIndex: number;
    targetCount: number;
    target: ArchersRevengeTarget;
    enemies: readonly MutableEnemy[];
    aimColumn: number;
    hp: number;
    maxHp: number;
    score: number;
    combo: number;
    arrows: readonly MutableArrow[];
    enemyProjectiles: readonly MutableProjectile[];
    correctAnswers: number;
    totalAttempts: number;
    lastOutcome: "correct" | "incorrect" | undefined;
    result: GameResults | undefined;
    gameTime: number;
    lastFireTime: number;
    targetChangeTimer: number;
    targetChangeIntervalMs: number;
    targetChangeCount: number;
    formationOffset: number;
    formationDirection: -1 | 1;
    destroyed: boolean;
  },
): ArchersRevengeSnapshot {
  return Object.freeze({
    seed: state.seed,
    phase: state.phase,
    status: state.phase,
    wave: state.wave,
    maxWaves: state.maxWaves,
    targetIndex: state.targetIndex,
    targetCount: state.targetCount,
    target: Object.freeze({ ...state.target }),
    prompt: state.target.translation,
    answer: state.target.term,
    correctAction: "confirm" as const,
    availableActions: ARCHERS_REVENGE_AVAILABLE_ACTIONS,
    targetWord: Object.freeze({ term: state.target.term, translation: state.target.translation }),
    enemies: Object.freeze(state.enemies.map(freezeEnemy)),
    aimColumn: state.aimColumn,
    playerX: columnX(state.aimColumn),
    hp: state.hp,
    lives: state.hp,
    energy: 0,
    maxHp: state.maxHp,
    score: state.score,
    combo: state.combo,
    arrows: Object.freeze(state.arrows.map(freezeArrow)),
    enemyProjectiles: Object.freeze(state.enemyProjectiles.map(freezeProjectile)),
    correctAnswers: state.correctAnswers,
    totalAttempts: state.totalAttempts,
    wrongAnswers: state.totalAttempts - state.correctAnswers,
    ...(state.lastOutcome === undefined ? {} : { lastOutcome: state.lastOutcome }),
    ...(state.result === undefined ? {} : { result: state.result }),
    gameTime: state.gameTime,
    lastFireTime: state.lastFireTime,
    targetChangeTimer: state.targetChangeTimer,
    targetChangeIntervalMs: state.targetChangeIntervalMs,
    targetChangeCount: state.targetChangeCount,
    formationOffset: state.formationOffset,
    formationDirection: state.formationDirection,
    destroyed: state.destroyed,
  });
}

/** Maps a canonical pointer X coordinate to one of the five aim columns. */
export function getArchersRevengeColumnFromPointer(pointerX: number, sceneWidth: number): number {
  if (!Number.isFinite(pointerX) || !Number.isFinite(sceneWidth) || sceneWidth <= 0) {
    throw new Error("Archer's Revenge pointer coordinates must be finite");
  }
  return clamp(Math.floor(pointerX / (sceneWidth / ARCHERS_REVENGE_COLUMNS)), 0, ARCHERS_REVENGE_COLUMNS - 1);
}

function createFormation(
  items: readonly VocabularyItem[],
  wave: number,
  targetIndex: number,
  seed: number,
): Formation {
  const targetColumn = ((seed + wave + targetIndex) % ARCHERS_REVENGE_COLUMNS + ARCHERS_REVENGE_COLUMNS)
    % ARCHERS_REVENGE_COLUMNS;
  const targetRow = ARCHERS_REVENGE_ROWS - 1;
  const targetItem = items[targetIndex];
  if (!targetItem) throw new Error("Archer's Revenge target index is outside the vocabulary input");
  const enemies = Array.from({ length: ARCHERS_REVENGE_ENEMIES_PER_WAVE }, (_, index): MutableEnemy => {
    const row = Math.floor(index / ARCHERS_REVENGE_COLUMNS);
    const column = index % ARCHERS_REVENGE_COLUMNS;
    const item = row === targetRow && column === targetColumn
      ? targetItem
      : distractorItem(items, targetItem, seed + wave * ARCHERS_REVENGE_ENEMIES_PER_WAVE + index);
    return {
      id: `wave:${wave}:row:${row}:column:${column}`,
      row,
      column,
      x: columnX(column),
      y: startingEnemyY(row),
      term: item.term,
      translation: item.translation,
      shielded: !(row === targetRow && column === targetColumn),
      shieldUp: !(row === targetRow && column === targetColumn),
    };
  });
  return {
    enemies,
    target: {
      term: targetItem.term,
      translation: targetItem.translation,
      column: targetColumn,
    },
  };
}

function itemsShareText(left: VocabularyItem, right: VocabularyItem): boolean {
  return left.term === right.term && left.translation === right.translation;
}

function distractorItem(
  items: readonly VocabularyItem[],
  targetItem: VocabularyItem,
  salt: number,
): VocabularyItem {
  const alternatives = items.filter((item) => !itemsShareText(item, targetItem));
  const pool = alternatives.length > 0 ? alternatives : items;
  return pool[((salt % pool.length) + pool.length) % pool.length]!;
}

function frontlineEnemies<T extends { readonly column: number; readonly row: number }>(enemies: readonly T[]): T[] {
  return enemies
    .filter((enemy) => !enemies.some((candidate) => candidate.column === enemy.column && candidate.row > enemy.row))
    .sort((first, second) => first.column - second.column || second.row - first.row);
}

function startingEnemyY(row: number): number {
  return ENEMY_START_Y + row * ENEMY_ROW_GAP;
}

function targetFromEnemy(enemy: MutableEnemy): ArchersRevengeTarget {
  return {
    term: enemy.term,
    translation: enemy.translation,
    column: enemy.column,
  };
}

function validateRestoredSnapshot(
  state: ArchersRevengeSnapshot,
  items: readonly VocabularyItem[],
  options: ResolvedOptions,
): void {
  if (state === null || typeof state !== "object") throw new Error("Archer's Revenge state must be an object");
  if (!(state.phase === "playing" || state.phase === "victory" || state.phase === "defeat")) {
    throw new Error("Archer's Revenge state phase is invalid");
  }
  if (state.seed !== options.seed || state.status !== state.phase || state.correctAction !== "confirm"
    || state.prompt !== state.target.translation || state.answer !== state.target.term
    || state.targetWord.term !== state.target.term
    || state.targetWord.translation !== state.target.translation
    || state.playerX !== columnX(state.aimColumn)
    || state.lives !== state.hp || state.energy !== 0
    || state.wrongAnswers !== state.totalAttempts - state.correctAnswers) {
    throw new Error("Archer's Revenge state aliases are invalid");
  }
  if (state.availableActions.length !== ARCHERS_REVENGE_AVAILABLE_ACTIONS.length
    || state.availableActions.some((action, index) => action !== ARCHERS_REVENGE_AVAILABLE_ACTIONS[index])) {
    throw new Error("Archer's Revenge state actions are invalid");
  }
  if (state.maxWaves !== options.maxWaves || state.maxHp !== options.maxHp) {
    throw new Error("Archer's Revenge state configuration is invalid");
  }
  if (!Number.isInteger(state.wave) || state.wave < 1 || state.wave > options.maxWaves) {
    throw new Error("Archer's Revenge state wave is invalid");
  }
  if (!Number.isInteger(state.targetCount) || state.targetCount !== items.length) {
    throw new Error("Archer's Revenge state target count is invalid");
  }
  if (!Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > state.targetCount) {
    throw new Error("Archer's Revenge state target index is invalid");
  }
  const expectedItem = items[Math.min(state.targetIndex, items.length - 1)]!;
  if (state.target.term !== expectedItem.term || state.target.translation !== expectedItem.translation
    || !Number.isInteger(state.target.column)
    || state.target.column < 0 || state.target.column >= ARCHERS_REVENGE_COLUMNS) {
    throw new Error("Archer's Revenge state target is invalid");
  }
  if (!Number.isInteger(state.aimColumn) || state.aimColumn < 0 || state.aimColumn >= ARCHERS_REVENGE_COLUMNS) {
    throw new Error("Archer's Revenge state aim column is invalid");
  }
  if (!Number.isInteger(state.hp) || state.hp < 0 || state.hp > options.maxHp) {
    throw new Error("Archer's Revenge state health is invalid");
  }
  if (!Number.isInteger(state.score) || state.score !== state.correctAnswers * 100
    || !Number.isInteger(state.combo) || state.combo < 0 || state.combo > state.correctAnswers) {
    throw new Error("Archer's Revenge state score is invalid");
  }
  if (!Number.isInteger(state.correctAnswers) || state.correctAnswers < 0
    || state.correctAnswers !== state.targetIndex || state.correctAnswers > state.totalAttempts) {
    throw new Error("Archer's Revenge state result counters are invalid");
  }
  if (!Number.isInteger(state.totalAttempts) || state.totalAttempts < 0) {
    throw new Error("Archer's Revenge state attempt counter is invalid");
  }
  if (!Number.isFinite(state.gameTime) || state.gameTime < 0 || !Number.isFinite(state.lastFireTime)) {
    throw new Error("Archer's Revenge state clock is invalid");
  }
  if (typeof state.destroyed !== "boolean" || (state.lastOutcome !== undefined
    && state.lastOutcome !== "correct" && state.lastOutcome !== "incorrect")) {
    throw new Error("Archer's Revenge state outcome is invalid");
  }
  if (state.phase === "playing" && state.targetIndex >= state.targetCount) {
    throw new Error("Archer's Revenge playing state is complete");
  }
  if (state.phase === "victory" && state.targetIndex !== state.targetCount) {
    throw new Error("Archer's Revenge victory state is incomplete");
  }
  if (state.phase === "playing" && state.result !== undefined) {
    throw new Error("Archer's Revenge playing state has a result");
  }
  if (state.phase !== "playing" && state.result === undefined) {
    throw new Error("Archer's Revenge terminal state has no result");
  }
  if (state.result !== undefined) {
    const result = gameResultsSchema.parse(state.result);
    const expectedAccuracy = state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts;
    const expectedXp = state.totalAttempts === 0
      ? 0
      : Math.floor(state.correctAnswers * 20 + expectedAccuracy * 10);
    if (result.correctAnswers !== state.correctAnswers || result.totalAttempts !== state.totalAttempts
      || result.score !== state.score || result.accuracy !== expectedAccuracy || result.xp !== expectedXp) {
      throw new Error("Archer's Revenge terminal result is incompatible");
    }
  }
  if (!Array.isArray(state.enemies) || state.enemies.length > ARCHERS_REVENGE_ENEMIES_PER_WAVE) {
    throw new Error("Archer's Revenge state formation is invalid");
  }
  const positions = new Set<string>();
  const enemyIds = new Set<string>();
  for (const enemy of state.enemies) {
    const position = `${enemy.row}:${enemy.column}`;
    if (positions.has(position) || enemyIds.has(enemy.id)
      || !Number.isInteger(enemy.column) || enemy.column < 0 || enemy.column >= ARCHERS_REVENGE_COLUMNS) {
      throw new Error("Archer's Revenge state enemy columns are invalid");
    }
    positions.add(position);
    enemyIds.add(enemy.id);
    if (!Number.isInteger(enemy.row) || enemy.row < 0 || enemy.row >= ARCHERS_REVENGE_ROWS
      || !Number.isFinite(enemy.x) || !Number.isFinite(enemy.y) || typeof enemy.id !== "string"
      || enemy.shielded !== enemy.shieldUp
      || !items.some((item) => item.term === enemy.term && item.translation === enemy.translation)
      || Math.abs(enemy.x - (columnX(enemy.column) + state.formationOffset)) > 0.001) {
      throw new Error("Archer's Revenge state enemy is invalid");
    }
  }
  if (state.phase === "playing" && state.enemies.length === 0) {
    throw new Error("Archer's Revenge playing state needs a formation");
  }
  if (state.phase === "playing") {
    const vulnerable = state.enemies.filter((enemy) => !enemy.shielded);
    if (vulnerable.length !== 1 || vulnerable[0]?.column !== state.target.column
      || vulnerable[0]?.term !== state.target.term
      || vulnerable[0]?.translation !== state.target.translation) {
      throw new Error("Archer's Revenge state target formation is invalid");
    }
  }
  if (state.phase === "victory" && (state.enemies.length !== 0 || state.arrows.length !== 0
    || state.enemyProjectiles.length !== 0)) {
    throw new Error("Archer's Revenge victory state has active gameplay objects");
  }
  const arrowIds = new Set<string>();
  for (const arrow of state.arrows) {
    if (arrowIds.has(arrow.id) || typeof arrow.id !== "string" || !Number.isInteger(arrow.column)
      || arrow.column < 0 || arrow.column >= ARCHERS_REVENGE_COLUMNS
      || arrow.x !== columnX(arrow.column) || !Number.isFinite(arrow.y)) {
      throw new Error("Archer's Revenge state arrow is invalid");
    }
    arrowIds.add(arrow.id);
  }
  const projectileIds = new Set<string>();
  for (const projectile of state.enemyProjectiles) {
    if (projectileIds.has(projectile.id) || typeof projectile.id !== "string" || !Number.isInteger(projectile.column)
      || projectile.column < 0 || projectile.column >= ARCHERS_REVENGE_COLUMNS
      || !Number.isFinite(projectile.x) || !Number.isFinite(projectile.y)) {
      throw new Error("Archer's Revenge state projectile is invalid");
    }
    projectileIds.add(projectile.id);
  }
  if (!Number.isFinite(state.targetChangeTimer) || state.targetChangeTimer < 0
    || state.targetChangeTimer > options.targetChangeIntervalMs
    || state.targetChangeIntervalMs !== options.targetChangeIntervalMs
    || !Number.isInteger(state.targetChangeCount) || state.targetChangeCount < 0
    || !Number.isFinite(state.formationOffset) || Math.abs(state.formationOffset) > options.formationTravel
    || (state.formationDirection !== -1 && state.formationDirection !== 1)) {
    throw new Error("Archer's Revenge state timing or formation motion is invalid");
  }
}

/**
 * Creates the deterministic Archer's Revenge formation shooter controller.
 * @param input Untrusted vocabulary content for the session.
 * @param deliver Callback that receives the first terminal result and outcome.
 * @param controllerOptions Deterministic wave and movement tuning.
 * @returns A transport-independent formation shooter controller.
 * @throws When vocabulary input or controller tuning is invalid.
 */
export function createArchersRevengeController(
  input: unknown,
  deliver: (result: GameResults, outcome: GameTerminalOutcome) => void | Promise<void>,
  controllerOptions: ArchersRevengeControllerOptions = {},
): ArchersRevengeController {
  const parsedInput = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "vocabulary");
  const items = content.items as readonly VocabularyItem[];
  const targetCount = items.length;
  const options = resolveOptions(controllerOptions, targetCount);
  let terminalOutcome: GameTerminalOutcome = "complete";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));
  let accountant = createResultAccountant();
  let formation = createFormation(items, 1, 0, options.seed);
  let phase: ArchersRevengePhase = "playing";
  let wave = 1;
  let targetIndex = 0;
  let aimColumn = 0;
  let hp = options.maxHp;
  let combo = 0;
  let arrows: MutableArrow[] = [];
  let enemyProjectiles: MutableProjectile[] = [];
  let lastOutcome: "correct" | "incorrect" | undefined;
  let terminalResult: GameResults | undefined;
  let gameTime = 0;
  let lastFireTime = -ARROW_COOLDOWN_MS;
  let targetChangeTimer = options.targetChangeIntervalMs;
  let targetChangeCount = 0;
  let formationOffset = 0;
  let formationDirection: -1 | 1 = 1;
  let destroyed = false;
  let nextArrowId = 0;
  let nextProjectileId = 0;

  const snapshot = (): ArchersRevengeSnapshot => freezeSnapshot({
    seed: options.seed,
    phase,
    wave,
    maxWaves: options.maxWaves,
    targetIndex,
    targetCount,
    target: formation.target,
    enemies: formation.enemies,
    aimColumn,
    hp,
    maxHp: options.maxHp,
    score: accountant.score,
    combo,
    arrows,
    enemyProjectiles,
    correctAnswers: accountant.correctAnswers,
    totalAttempts: accountant.totalAttempts,
    lastOutcome,
    result: terminalResult,
    gameTime,
    lastFireTime,
    targetChangeTimer,
    targetChangeIntervalMs: options.targetChangeIntervalMs,
    targetChangeCount,
    formationOffset,
    formationDirection,
    destroyed,
  });

  const resultForCounters = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const finish = (nextPhase: "victory" | "defeat"): GameResults => {
    if (terminalResult) return terminalResult;
    phase = nextPhase;
    terminalOutcome = nextPhase;
    if (nextPhase === "victory") {
      formation = { ...formation, enemies: [] };
      arrows = [];
      enemyProjectiles = [];
    }
    terminalResult = resultForCounters();
    completion.complete(terminalResult);
    return terminalResult;
  };

  const setTarget = (enemy: MutableEnemy, item?: VocabularyItem): void => {
    const selectedItem = item ?? items[Math.min(targetIndex, targetCount - 1)]!;
    const enemies = formation.enemies.map((candidate, index) => {
      if (candidate.id === enemy.id) {
        return {
          ...candidate,
          term: selectedItem.term,
          translation: selectedItem.translation,
          shielded: false,
          shieldUp: false,
        };
      }
      if (!itemsShareText(candidate, selectedItem)) {
        return {
          ...candidate,
          shielded: true,
          shieldUp: true,
        };
      }
      const distractor = distractorItem(
        items,
        selectedItem,
        options.seed + wave * 41 + targetIndex * 17 + targetChangeCount + index,
      );
      return {
        ...candidate,
        term: distractor.term,
        translation: distractor.translation,
        shielded: true,
        shieldUp: true,
      };
    });
    const selected = enemies.find((candidate) => candidate.id === enemy.id)!;
    formation = {
      enemies,
      target: targetFromEnemy(selected),
    };
  };

  const setNextTarget = (): void => {
    const nextItem = items[targetIndex];
    if (!nextItem) throw new Error("Archer's Revenge cannot advance beyond the vocabulary input");
    const candidates = frontlineEnemies(formation.enemies);
    const nextEnemy = candidates[(options.seed + wave + targetIndex) % candidates.length];
    if (!nextEnemy) throw new Error("Archer's Revenge could not select the next target");
    setTarget(nextEnemy, nextItem);
    targetChangeTimer = options.targetChangeIntervalMs;
  };

  const changeTimedTarget = (): void => {
    const candidates = frontlineEnemies(formation.enemies);
    if (candidates.length < 2) return;
    targetChangeCount += 1;
    let targetPosition = (options.seed + wave * 31 + targetIndex * 17 + targetChangeCount) % candidates.length;
    if (candidates[targetPosition]?.column === formation.target.column) targetPosition = (targetPosition + 1) % candidates.length;
    const nextEnemy = candidates[targetPosition];
    if (nextEnemy) setTarget(nextEnemy, {
      term: formation.target.term,
      translation: formation.target.translation,
    });
  };

  const advanceFormation = (deltaMs: number): void => {
    let remaining = options.formationSpeed * deltaMs / 1_000;
    while (remaining > 0) {
      const boundaryDistance = formationDirection === 1
        ? options.formationTravel - formationOffset
        : formationOffset + options.formationTravel;
      if (remaining < boundaryDistance || boundaryDistance === 0) {
        if (boundaryDistance === 0) formationDirection = formationDirection === 1 ? -1 : 1;
        else formationOffset += formationDirection * remaining;
        remaining = boundaryDistance === 0 ? remaining : 0;
      } else {
        formationOffset += formationDirection * boundaryDistance;
        remaining -= boundaryDistance;
        formationDirection = formationDirection === 1 ? -1 : 1;
      }
    }
  };

  const advanceAfterCorrect = (): GameResults | undefined => {
    targetIndex += 1;
    if (targetIndex >= targetCount) return finish("victory");
    if (formation.enemies.length === 0) {
      wave += 1;
      formation = createFormation(items, wave, targetIndex, options.seed);
      formationOffset = 0;
      formationDirection = 1;
      targetChangeTimer = options.targetChangeIntervalMs;
      return undefined;
    }
    setNextTarget();
    return undefined;
  };

  const snapshotAfterAim = (accepted: boolean): ArchersRevengeAimResult => Object.freeze({
    accepted,
    column: aimColumn,
    snapshot: snapshot(),
  });

  const actionResult = (
    snapshotValue: ArchersRevengeSnapshot,
    values: Omit<ArchersRevengeChooseResult, "snapshot"> = {
      accepted: false,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
    },
  ): ArchersRevengeChooseResult => Object.freeze({
    ...values,
    ...(phase === "playing"
      ? {}
      : {
        terminal: true,
        completed: true,
        ...(terminalResult === undefined ? {} : { result: terminalResult }),
      }),
    snapshot: snapshotValue,
  });

  const spawnEnemyFire = (): boolean => {
    const source = frontlineEnemies(formation.enemies).find((enemy) => enemy.column !== aimColumn)
      ?? frontlineEnemies(formation.enemies)[0];
    if (!source) return false;
    enemyProjectiles = [...enemyProjectiles, {
      id: `projectile:${nextProjectileId++}`,
      column: source.column,
      x: source.x,
      y: source.y + ENEMY_HEIGHT / 2,
    }];
    return true;
  };

  const aim = (column: number): ArchersRevengeAimResult => {
    const nextColumn = Number.isFinite(column)
      ? clamp(Math.round(column), 0, ARCHERS_REVENGE_COLUMNS - 1)
      : aimColumn;
    if (destroyed || phase !== "playing") return snapshotAfterAim(false);
    aimColumn = nextColumn;
    return snapshotAfterAim(true);
  };

  const fire = (column?: number): ArchersRevengeFireResult => {
    if (column !== undefined) aim(column);
    const before = snapshot();
    if (destroyed || phase !== "playing" || gameTime - lastFireTime < ARROW_COOLDOWN_MS) {
      return Object.freeze({
        accepted: false,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
        snapshot: before,
      });
    }
    const arrow: MutableArrow = {
      id: `arrow:${nextArrowId++}`,
      column: aimColumn,
      x: columnX(aimColumn),
      y: PLAYER_Y - ARROW_START_OFFSET,
    };
    arrows = [...arrows, arrow];
    lastFireTime = gameTime;
    return Object.freeze({
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      arrowId: arrow.id,
      snapshot: snapshot(),
    });
  };

  return Object.freeze({
    snapshot,
    choose(action: InputActionId): ArchersRevengeChooseResult {
      const before = snapshot();
      if (destroyed || phase !== "playing" || !ARCHERS_REVENGE_AVAILABLE_ACTIONS.includes(action)) {
        return actionResult(before);
      }
      if (action === "move-left") {
        aim(aimColumn - 1);
        return actionResult(snapshot(), { accepted: true, correct: false, progressed: false, terminal: false, completed: false });
      }
      if (action === "move-right") {
        aim(aimColumn + 1);
        return actionResult(snapshot(), { accepted: true, correct: false, progressed: false, terminal: false, completed: false });
      }
      const fired = fire();
      return actionResult(fired.snapshot, {
        accepted: fired.accepted,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    },
    applyHazard(): ArchersRevengeChooseResult {
      const before = snapshot();
      if (destroyed || phase !== "playing" || !spawnEnemyFire()) return actionResult(before);
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
      });
    },
    aimColumn(column: number): ArchersRevengeAimResult {
      return aim(column);
    },
    aimPointer(pointerX: number, sceneWidth: number): ArchersRevengeAimResult {
      return aim(getArchersRevengeColumnFromPointer(pointerX, sceneWidth));
    },
    fire(column?: number): ArchersRevengeFireResult {
      return fire(column);
    },
    tick(deltaMs: number): ArchersRevengeTickResult {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) {
        throw new Error("Archer's Revenge tick delta must be a nonnegative finite number");
      }
      const before = snapshot();
      if (destroyed || phase !== "playing") {
        return Object.freeze({
          arrowHits: Object.freeze([]),
          projectileHits: 0,
          breached: false,
          terminal: false,
          snapshot: before,
        });
      }

      const seconds = deltaMs / 1_000;
      gameTime += deltaMs;
      advanceFormation(deltaMs);
      targetChangeTimer -= deltaMs;
      while (targetChangeTimer <= 0) {
        targetChangeTimer += options.targetChangeIntervalMs;
        changeTimedTarget();
      }
      const movedEnemies = formation.enemies.map((enemy) => ({
        ...enemy,
        x: columnX(enemy.column) + formationOffset,
        y: enemy.y + options.formationDescendSpeed * seconds,
      }));
      formation = { ...formation, enemies: movedEnemies };
      const formationBreached = movedEnemies.some((enemy) => enemy.y + ENEMY_HEIGHT / 2 >= BREACH_Y);
      if (formationBreached) {
        hp = Math.max(0, hp - 1);
        combo = 0;
        if (hp === 0) {
          const result = finish("defeat");
          return Object.freeze({
            arrowHits: Object.freeze([]),
            projectileHits: 0,
            breached: true,
            terminal: true,
            result,
            snapshot: snapshot(),
          });
        }
        formation = {
          ...formation,
          enemies: movedEnemies.map((enemy) => ({
            ...enemy,
            y: startingEnemyY(enemy.row),
          })),
        };
        return Object.freeze({
          arrowHits: Object.freeze([]),
          projectileHits: 0,
          breached: true,
          terminal: false,
          snapshot: snapshot(),
        });
      }

      const movedArrows = arrows.map((arrow) => ({
        arrow,
        previousY: arrow.y,
        nextY: arrow.y - options.arrowSpeed * seconds,
      }));
      const movedProjectiles = enemyProjectiles.map((projectile) => ({
        projectile,
        previousY: projectile.y,
        nextY: projectile.y + options.projectileSpeed * seconds,
      }));
      const arrowHits: ArchersRevengeArrowHit[] = [];
      const hitArrowIds = new Set<string>();
      const hitEnemyIds = new Set<string>();
      const spawnedProjectiles: MutableProjectile[] = [];

      for (const moved of movedArrows) {
        const enemy = formation.enemies
          .filter((candidate) => !hitEnemyIds.has(candidate.id)
            && Math.abs(moved.arrow.x - candidate.x) < ENEMY_WIDTH / 2
            && distanceToSegment(candidate.y, moved.previousY, moved.nextY) < ENEMY_HEIGHT / 2)
          .sort((first, second) => second.y - first.y)[0];
        if (!enemy) continue;
        hitArrowIds.add(moved.arrow.id);
        const correct = !enemy.shielded;
        arrowHits.push(Object.freeze({ enemyId: enemy.id, correct }));
        accountant.recordAttempt({ correct });
        lastOutcome = correct ? "correct" : "incorrect";
        if (correct) {
          hitEnemyIds.add(enemy.id);
          accountant.addScore(100);
          combo += 1;
        } else {
          combo = 0;
          spawnedProjectiles.push({
            id: `projectile:${nextProjectileId++}`,
            column: enemy.column,
            x: enemy.x,
            y: enemy.y + ENEMY_HEIGHT / 2,
          });
        }
      }

      arrows = movedArrows
        .filter(({ arrow }) => !hitArrowIds.has(arrow.id) && arrow.y >= -40)
        .map(({ arrow, nextY }) => ({ ...arrow, y: nextY }));
      formation = {
        ...formation,
        enemies: formation.enemies.filter((enemy) => !hitEnemyIds.has(enemy.id)),
      };
      for (const hit of arrowHits) {
        if (hit.correct) {
          const result = advanceAfterCorrect();
          if (result) {
            return Object.freeze({
              arrowHits: Object.freeze(arrowHits),
              projectileHits: 0,
              breached: false,
              terminal: true,
              result,
              snapshot: snapshot(),
            });
          }
        }
      }

      let projectileHits = 0;
      const hitProjectileIds = new Set<string>();
      for (const moved of movedProjectiles) {
        if (segmentContains(moved.previousY, moved.nextY, PLAYER_Y, 22)
          && moved.projectile.column === aimColumn) {
          hitProjectileIds.add(moved.projectile.id);
          projectileHits += 1;
          hp = Math.max(0, hp - 1);
          combo = 0;
        }
      }
      enemyProjectiles = [
        ...movedProjectiles
          .filter(({ projectile }) => !hitProjectileIds.has(projectile.id) && projectile.y <= ARCHERS_REVENGE_CANVAS.height + 40)
          .map(({ projectile, nextY }) => ({ ...projectile, y: nextY })),
        ...spawnedProjectiles,
      ];

      if (hp === 0) {
        const result = finish("defeat");
        return Object.freeze({
          arrowHits: Object.freeze(arrowHits),
          projectileHits,
          breached: false,
          terminal: true,
          result,
          snapshot: snapshot(),
        });
      }

      return Object.freeze({
        arrowHits: Object.freeze(arrowHits),
        projectileHits,
        breached: false,
        terminal: false,
        snapshot: snapshot(),
      });
    },
    capture: snapshot,
    restore(state: ArchersRevengeSnapshot): void {
      if (destroyed) return;
      validateRestoredSnapshot(state, items, options);
      accountant = createResultAccountant();
      for (let index = 0; index < state.totalAttempts; index += 1) {
        accountant.recordAttempt({ correct: index < state.correctAnswers });
      }
      accountant.addScore(state.score);
      phase = state.phase;
      wave = state.wave;
      targetIndex = state.targetIndex;
      formation = {
        enemies: state.enemies.map((enemy) => ({ ...enemy })),
        target: { ...state.target },
      };
      aimColumn = state.aimColumn;
      hp = state.hp;
      combo = state.combo;
      arrows = state.arrows.map((arrow) => ({ ...arrow }));
      enemyProjectiles = state.enemyProjectiles.map((projectile) => ({ ...projectile }));
      lastOutcome = state.lastOutcome;
      terminalResult = state.result;
      gameTime = state.gameTime;
      lastFireTime = state.lastFireTime;
      targetChangeTimer = state.targetChangeTimer;
      targetChangeCount = state.targetChangeCount;
      formationOffset = state.formationOffset;
      formationDirection = state.formationDirection;
      destroyed = state.destroyed;
      nextArrowId = state.arrows.reduce((next, arrow) => {
        const id = Number(arrow.id.split(":")[1]);
        return Number.isInteger(id) ? Math.max(next, id + 1) : next;
      }, 0);
      nextProjectileId = state.enemyProjectiles.reduce((next, projectile) => {
        const id = Number(projectile.id.split(":")[1]);
        return Number.isInteger(id) ? Math.max(next, id + 1) : next;
      }, 0);
      if (state.phase !== "playing" || state.destroyed) completion.sealWithoutDelivery();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

function dimensions(scene: PhaserSceneLike): { readonly width: number; readonly height: number } {
  return {
    width: scene.scale?.width ?? ARCHERS_REVENGE_CANVAS.width,
    height: scene.scale?.height ?? ARCHERS_REVENGE_CANVAS.height,
  };
}

function pointerInScene(
  scene: PhaserSceneLike,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): { readonly x: number; readonly y: number } {
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || (rect.height !== undefined && rect.height <= 0)) {
    return { x: clientX, y: clientY };
  }
  return {
    x: (clientX - rect.left) * (width / rect.width),
    y: (clientY - (rect.top ?? 0)) * (height / (rect.height ?? height)),
  };
}

function createScene(context: SceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let previousKeys = new Set<string>();
  let animationMs = 0;
  let cleaned = false;
  let reportedAttempts = 0;
  let reportedPhase: ArchersRevengePhase = "playing";
  const normalize = createInputActionNormalizer({
    keyboard: ARCHERS_REVENGE_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2_000;
    context.controller.tick(deltaMs);
  });

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const activeResources = resources;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const scaleX = width / ARCHERS_REVENGE_CANVAS.width;
    const scaleY = height / ARCHERS_REVENGE_CANVAS.height;
    const renderedWidth = scene.game?.canvas?.getBoundingClientRect?.().width ?? width;
    const renderedScale = Math.max(0.1, renderedWidth / width);
    const promptFontSize = Math.ceil(18 / renderedScale);
    const choiceFontSize = Math.ceil(16 / renderedScale);
    const statusFontSize = Math.ceil(14 / renderedScale);
    const pulse = Math.sin(animationMs / 2_000 * Math.PI * 2) * 3;
    const frontlineIds = new Set(frontlineEnemies(state.enemies).map((enemy) => enemy.id));
    let labelIndex = 0;

    activeResources.graphics.clear();
    if (!activeResources.art.ground("world:ground", width, height)) activeResources.graphics.fillStyle(0x07131f, 1).fillRect(0, 0, width, height);
    activeResources.graphics.fillStyle(0x102b3d, 0.96)
      .fillRoundedRect(width * 0.04, height * 0.23, width * 0.92, height * 0.61, 22);
    activeResources.graphics.fillStyle(0x1d5160, 0.72)
      .fillRoundedRect(width * 0.04, height * 0.23, width * 0.92, height * 0.07, 16);

    for (const [index, enemy] of state.enemies.entries()) {
      const x = enemy.x * scaleX;
      const y = enemy.y * scaleY + pulse;
      const enemyWidth = Math.min(130, width * 0.13);
      const enemyHeight = 46 * scaleY;
      if (!activeResources.art.place(`enemy:${index}`, "enemy:idle", {
        x,
        y,
        width: enemyWidth * 0.8,
        height: enemyHeight * 1.4,
        depth: 7,
        alpha: 1,
      })) {
        activeResources.graphics.fillStyle(0x244b57, 1)
          .fillRoundedRect(x - enemyWidth / 2, y - enemyHeight / 2, enemyWidth, enemyHeight, 12);
        activeResources.graphics.lineStyle(3, 0x8fb8c2, 0.95)
          .strokeRoundedRect(x - enemyWidth / 2, y - enemyHeight / 2, enemyWidth, enemyHeight, 12);
      }
      if (frontlineIds.has(enemy.id)) {
        const label = activeResources.enemyLabels[labelIndex];
        const labelPadding = Math.ceil(4 / renderedScale);
        label
          ?.setFontSize?.(choiceFontSize)
          .setBackgroundColor?.("rgba(8, 28, 38, 0.9)")
          .setPadding?.(labelPadding, Math.ceil(2 / renderedScale))
          .setOrigin?.(0.5, 0)
          .setWordWrapWidth?.(Math.max(1, width / ARCHERS_REVENGE_COLUMNS - 12 - labelPadding * 2), true)
          .setText(enemy.term);
        label?.setPosition(
          clampArchersRevengeLabelX(x, enemy.column, label.width ?? 0, width),
          y + enemyHeight / 2 + 7,
        );
        labelIndex += 1;
      }
    }
    activeResources.enemyLabels.slice(labelIndex).forEach((label) => label.setText(""));
    for (const arrow of state.arrows) {
      activeResources.graphics.fillStyle(0xf9d65c, 1)
        .fillRect(arrow.x * scaleX - 3, arrow.y * scaleY, 6, 24 * scaleY);
    }
    for (const projectile of state.enemyProjectiles) {
      activeResources.graphics.fillStyle(0xf06a5d, 1)
        .fillCircle(projectile.x * scaleX, projectile.y * scaleY, Math.max(5, 8 * scaleX));
    }
    if (!activeResources.art.place("player", "player:idle", {
      x: columnX(state.aimColumn) * scaleX,
      y: PLAYER_Y * scaleY,
      width: Math.max(38, 56 * scaleX),
      depth: 8,
    })) {
      activeResources.graphics.fillStyle(0xf5a742, 1)
        .fillCircle(columnX(state.aimColumn) * scaleX, PLAYER_Y * scaleY, Math.max(15, 22 * scaleX));
    }
    activeResources.art.sweep();
    activeResources.graphics.lineStyle(3, 0xffe7a3, 1)
      .strokeRoundedRect(
        columnX(state.aimColumn) * scaleX - 30 * scaleX,
        PLAYER_Y * scaleY - 30 * scaleY,
        60 * scaleX,
        60 * scaleY,
        12,
      );
    activeResources.graphics.fillStyle(0xffe7a3, 0.35)
      .fillRect(0, BREACH_Y * scaleY, width, 3 * scaleY);

    activeResources.title.setText("").setPosition(28, 20);
    activeResources.prompt
      .setFontSize?.(promptFontSize)
      .setWordWrapWidth?.(width - 56, true)
      .setText(state.target.translation)
      .setPosition(28, 24);
    activeResources.progress
      .setFontSize?.(statusFontSize)
      .setText(
        `${state.wave}/${state.maxWaves}  ♥ ${state.hp}/${state.maxHp}  •  ${state.score}  •  x${state.combo}`,
      )
      .setPosition(28, 82);
    activeResources.feedback
      .setText(state.phase === "victory" ? "VICTORY" : state.phase === "defeat" ? "DEFEAT" : "")
      .setPosition(28, height - 70);
    activeResources.instructions
      .setText("")
      .setPosition(28, height - 36);
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    frameScheduler.cancel();
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
    for (const label of activeResources.enemyLabels) label.destroy();
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
    if (!this.add) throw new Error("Archer's Revenge requires Phaser display services");
    const textStyle = { fontFamily: "Arial", color: "#f8fbff", fontSize: "20px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(28, 20, "ARCHER'S REVENGE", { ...textStyle, fontSize: "30px", fontStyle: "bold" }),
      prompt: this.add.text(28, 62, "", { ...textStyle, fontSize: "25px" }),
      progress: this.add.text(28, 103, "", { ...textStyle, fontSize: "16px", color: "#bde9ed" }),
      feedback: this.add.text(28, 0, "", { ...textStyle, fontSize: "18px", color: "#ffe7a3" }),
      instructions: this.add.text(28, 0, "", { ...textStyle, fontSize: "15px", color: "#c5d8e6" }),
      enemyLabels: Array.from({ length: ARCHERS_REVENGE_ENEMIES_PER_WAVE }, () =>
        this.add!.text(0, 0, "", { ...textStyle, fontSize: "16px", align: "center" }),
      ),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const processInput = (scene: PhaserSceneLike): void => {
    if (context.sessionMode !== "playing") return;
    const input = context.inputController.snapshot();
    const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
    previousKeys = new Set(input.keys);
    for (const code of pressed) {
      const action = normalize({ modality: "keyboard", code })[0]?.action;
      if (action) context.controller.choose(action);
    }
    if (input.pointer.released && !input.pointer.cancelled) {
      const action = normalize({ modality: "pointer", phase: "up", x: input.pointer.x, y: input.pointer.y })[0]?.action;
      if (action === "confirm") {
        const { width, height } = dimensions(scene);
        const pointer = pointerInScene(scene, input.pointer.x, input.pointer.y, width, height);
        context.controller.aimPointer(pointer.x, width);
        context.controller.choose("confirm");
      }
    }
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources) return;
    processInput(this);
    frameScheduler.tick(delta);
    const result = context.controller.snapshot();
    if (result.totalAttempts !== reportedAttempts || result.phase !== reportedPhase) {
      context.diagnostic({
        level: "info",
        code: result.phase === "playing" ? "ARCHERS_REVENGE_COLLISION" : "ARCHERS_REVENGE_TERMINAL",
        message: "Archer's Revenge processed a formation event.",
        details: {
          phase: result.phase,
          correct: result.lastOutcome === "correct",
          wave: result.wave,
        },
      });
      reportedAttempts = result.totalAttempts;
      reportedPhase = result.phase;
    }
    updateView(this);
  };

  return {
    key: ARCHERS_REVENGE_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: context.controller.capture,
      apkRestoreResponsiveState: (state: unknown): void => {
        if (typeof state !== "object" || state === null) throw new Error("Archer's Revenge responsive state is invalid");
        context.controller.restore(state as ArchersRevengeSnapshot);
      },
      apkRecompose: (nextComposition: SceneContext["composition"]): void => {
        void nextComposition;
      },
    },
  };
}

/** Creates the standard guided experience and Phaser shooter cartridge. */
export function createArchersRevengeCartridge(): StandardExperienceCartridge {
  let activeController: ArchersRevengeController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: ARCHERS_REVENGE_ID,
    title: "Archer's Revenge",
    description: "Aim an archer at the English word that matches each Thai target.",
    inputMode: "vocabulary",
     objective: "Clear every Thai target by hitting its matching English word.",
    mechanicInstruction: "Aim left or right, then fire at the English word that matches the Thai target.",
    keyboardKeys: ["A", "Left Arrow", "D", "Right Arrow", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const state = controller.snapshot();
      if (actionId === "action:select-correct") {
        controller.fire(state.target.column);
        controller.tick(1_000);
        return;
      }
      const wrong = frontlineEnemies(state.enemies).find((enemy) => enemy.shielded);
      if (wrong) {
        controller.fire(wrong.column);
        controller.tick(1_000);
      }
    },
  });

  return {
    manifest: {
      id: ARCHERS_REVENGE_ID,
      title: "Archer's Revenge",
      description: "Aim a precision archer at the translation target and break enemy formations.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["archers-revenge/player-bow"],
        capabilities: [
          "capability:bounded-frame-delta",
          "capability:formation-edge-reversal",
          "capability:formation-shooter",
        "capability:input-action-normalization",
        "capability:language-target-progression",
          "capability:projectile-collision",
          "capability:result-accounting",
          "capability:single-completion-emission",
          "capability:timed-target-rotation",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createArchersRevengeController(
        input,
        sessionMode === "playing" ? (result, outcome) => context.complete(result, outcome) : () => undefined,
        { seed: context.seed ?? 0 },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "ARCHERS_REVENGE_READY",
        message: "Archer's Revenge formation is ready.",
        details: {
          cartridgeId: ARCHERS_REVENGE_ID,
          editionId: context.edition.id,
          maxWaves: controller.snapshot().maxWaves,
        },
      });
      return {
        width: ARCHERS_REVENGE_CANVAS.width,
        height: ARCHERS_REVENGE_CANVAS.height,
        render: { antialias: true, pixelArt: false },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          diagnostic: context.diagnostic,
          sessionMode,
        }),
      };
    },
  };
}
