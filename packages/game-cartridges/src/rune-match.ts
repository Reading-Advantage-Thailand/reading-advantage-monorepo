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
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable identifier for the Rune Match cartridge. */
export const RUNE_MATCH_ID = "rune-match" as const;

/** Fixed Phaser canvas dimensions before host scaling. */
export const RUNE_MATCH_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Number of rows in the default deterministic board. */
export const RUNE_MATCH_DEFAULT_ROWS = 8;

/** Number of columns in the default deterministic board. */
export const RUNE_MATCH_DEFAULT_COLUMNS = 6;

/** Delay between real-time monster attacks during active play. */
export const RUNE_MATCH_ATTACK_INTERVAL_MS = 5000;

/** Keyboard bindings for cursor movement and cell selection. */
export const RUNE_MATCH_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
  Enter: "confirm",
  Space: "confirm",
});

/** Semantic actions exposed by the Rune Match controller. */
export const RUNE_MATCH_AVAILABLE_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
]);

/** A row and column in the Rune Match board. */
export interface RuneMatchCell {
  /** Zero-based board row. */
  readonly row: number;
  /** Zero-based board column. */
  readonly col: number;
}

/** A vocabulary rune or a power rune on the board. */
export type RuneMatchRune =
  | {
      readonly id: string;
      readonly type: "vocabulary";
      readonly wordId: string;
      readonly term: string;
      readonly translation: string;
    }
  | {
      readonly id: string;
      readonly type: "heal" | "shield";
    };

/** Vocabulary-only Rune Match tile. */
export type VocabularyRune = Extract<RuneMatchRune, { readonly type: "vocabulary" }>;

/** Power-up-only Rune Match tile. */
export type PowerUpRune = Extract<RuneMatchRune, { readonly type: "heal" | "shield" }>;

/** Compatibility alias for the legacy Rune Match rule vocabulary. */
export type Rune = RuneMatchRune;

/** Compatibility alias for the legacy grid position name. */
export type GridPosition = RuneMatchCell;

/** One contiguous group removed by a successful board swap. */
export interface RuneMatchGroup {
  /** Cells in the group. */
  readonly cells: readonly RuneMatchCell[];
  /** Compatibility alias for group cells. */
  readonly coords: readonly RuneMatchCell[];
  /** Rune type shared by every cell in the group. */
  readonly type: RuneMatchRune["type"];
  /** Vocabulary identity for a vocabulary group. */
  readonly wordId?: string;
  /** Whether the group has five or more runes. */
  readonly isSpecial: boolean;
}

/** Result of scanning a board for contiguous rune groups. */
export type MatchGroup = RuneMatchGroup;

/** One processed match group annotated with its deterministic cascade wave. */
export type RuneMatchProcessedGroup = RuneMatchGroup & { readonly cascadeIndex: number };

/** Result of processing all matches and gravity refills for one board state. */
export interface RuneMatchProcessResult {
  /** Board after every deterministic cascade has settled. */
  readonly grid: RuneMatchRune[][];
  /** Number of match-and-refill waves processed. */
  readonly cascades: number;
  /** Groups removed in cascade order. */
  readonly groups: readonly RuneMatchProcessedGroup[];
}

/** Active or terminal Rune Match phase. */
export type RuneMatchPhase = "playing" | "victory" | "defeat";

/** Cursor movement directions accepted by the controller. */
export type RuneMatchDirection = "left" | "right" | "up" | "down";

/** Outcome label for the latest completed board turn. */
export type RuneMatchOutcome =
  | "selected"
  | "match"
  | "heal"
  | "shield"
  | "invalid-swap"
  | "counterattack"
  | "blocked";

/** One optional deterministic configuration for a Rune Match session. */
export interface RuneMatchOptions {
  /** Deterministic seed used for board generation and refills. */
  readonly seed?: number;
  /** Optional starting board used by focused mechanics tests and replays. */
  readonly grid?: readonly (readonly RuneMatchRune[])[];
  /** Compatibility name for an optional starting board. */
  readonly initialGrid?: readonly (readonly RuneMatchRune[])[];
  /** Optional board row count when no starting board is supplied. */
  readonly rows?: number;
  /** Optional board column count when no starting board is supplied. */
  readonly columns?: number;
  /** Starting player health. */
  readonly playerHealth?: number;
  /** Compatibility name for starting player health. */
  readonly playerHp?: number;
  /** Maximum player health. */
  readonly playerMaxHealth?: number;
  /** Starting monster health. */
  readonly monsterHealth?: number;
  /** Compatibility name for starting monster health. */
  readonly monsterHp?: number;
  /** Damage dealt by the monster after a turn. */
  readonly monsterAttack?: number;
  /** Damage caused by a nonmatching swap. */
  readonly invalidSwapDamage?: number;
  /** Health restored by each matched heal rune. */
  readonly healAmount?: number;
}

/** Immutable player combat state. */
export interface RuneMatchPlayer {
  /** Current player health. */
  readonly health: number;
  /** Compatibility alias for current player health. */
  readonly hp: number;
  /** Maximum player health. */
  readonly maxHealth: number;
  /** Compatibility alias for maximum player health. */
  readonly maxHp: number;
  /** Whether one counterattack is blocked by a shield. */
  readonly hasShield: boolean;
}

/** Immutable monster combat state. */
export interface RuneMatchMonster {
  /** Stable monster label. */
  readonly type: "goblin";
  /** Current monster health. */
  readonly health: number;
  /** Compatibility alias for current monster health. */
  readonly hp: number;
  /** Maximum monster health. */
  readonly maxHealth: number;
  /** Compatibility alias for maximum monster health. */
  readonly maxHp: number;
  /** Damage dealt by one counterattack. */
  readonly attack: number;
}

/** Immutable state exposed by the Rune Match controller. */
export interface RuneMatchSnapshot {
  /** Current game phase. */
  readonly phase: RuneMatchPhase;
  /** Compatibility alias for the current game phase. */
  readonly status: RuneMatchPhase;
  /** Deterministic session seed. */
  readonly seed: number;
  /** Shared catalog mechanic label for host diagnostics. */
  readonly mechanic: string;
  /** Current deterministic board. */
  readonly grid: readonly (readonly RuneMatchRune[])[];
  /** Current cursor cell. */
  readonly cursor: RuneMatchCell;
  /** First selected cell in the current pair, when present. */
  readonly selectedCell: RuneMatchCell | undefined;
  /** Index of the next vocabulary target. */
  readonly targetIndex: number;
  /** Number of vocabulary targets in the session. */
  readonly targetCount: number;
  /** Current vocabulary prompt. */
  readonly prompt: string;
  /** Current vocabulary answer. */
  readonly answer: string;
  /** Semantic action used to confirm the current cell selection. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by the controller. */
  readonly availableActions: readonly InputActionId[];
  /** Milliseconds until the next real-time monster attack. */
  readonly attackTimerMs: number;
  /** Current player combat state. */
  readonly player: RuneMatchPlayer;
  /** Current player health as a direct field. */
  readonly playerHealth: number;
  /** Generic contract alias for the remaining player lives. */
  readonly lives: number;
  /** Generic contract alias for the remaining player energy. */
  readonly energy: number;
  /** Current monster combat state. */
  readonly monster: RuneMatchMonster;
  /** Current monster health as a direct field. */
  readonly monsterHealth: number;
  /** Number of correct language matches. */
  readonly correctAnswers: number;
  /** Number of completed adjacent-cell attempts. */
  readonly totalAttempts: number;
  /** Current score. */
  readonly score: number;
  /** Number of completed board turns. */
  readonly turns: number;
  /** Number of deterministic match-and-refill waves in the latest turn. */
  readonly cascades: number;
  /** Deterministic refill cursor retained across responsive restoration. */
  readonly refillIndex: number;
  /** Cells removed by the latest match. */
  readonly lastRemovedCells: readonly RuneMatchCell[];
  /** Latest gameplay outcome. */
  readonly lastOutcome: RuneMatchOutcome | undefined;
  /** One terminal result, when the session has ended. */
  readonly result: GameResults | undefined;
  /** Whether the scene lifecycle has destroyed the controller. */
  readonly destroyed: boolean;
}

/** Result returned by one cursor, selection, or turn operation. */
export interface RuneMatchActionResult {
  /** Whether the operation changed the active session. */
  readonly accepted: boolean;
  /** Whether the operation produced a correct language match. */
  readonly correct: boolean;
  /** Whether ordered vocabulary progress advanced. */
  readonly progressed: boolean;
  /** Whether the operation reached a terminal phase. */
  readonly terminal: boolean;
  /** Compatibility alias for terminal. */
  readonly completed: boolean;
  /** Whether the operation completed an adjacent-cell turn. */
  readonly turnCompleted: boolean;
  /** Latest combat outcome. */
  readonly outcome?: RuneMatchOutcome;
  /** First terminal result, when this operation ended the session. */
  readonly result?: GameResults;
  /** State after the operation. */
  readonly snapshot: RuneMatchSnapshot;
}

/** Transport-independent Rune Match rules and lifecycle controls. */
export interface RuneMatchController {
  /** Returns the current immutable board and combat state. */
  snapshot(): RuneMatchSnapshot;
  /** Moves the cursor without recording an attempt. */
  moveCursor(direction: RuneMatchDirection): RuneMatchActionResult;
  /** Selects a cell or resolves a pair of adjacent cells. */
  selectCell(cell: RuneMatchCell): RuneMatchActionResult;
  /** Applies one semantic keyboard action to the cursor and board. */
  choose(action: InputActionId): RuneMatchActionResult;
  /** Runs one monster counterattack turn. */
  advanceTurn(): RuneMatchActionResult;
  /** Advances the real-time monster attack timer. */
  advanceTime(deltaMs: number): RuneMatchActionResult;
  /** Compatibility alias for one monster hazard turn. */
  applyHazard(): RuneMatchActionResult;
  /** Captures state before a responsive scene reflow. */
  capture(): RuneMatchSnapshot;
  /** Restores validated state captured before a responsive scene reflow. */
  restore(snapshot: RuneMatchSnapshot): void;
  /** Returns one deterministic valid move for tutorial and QC support. */
  findValidMove(): readonly [RuneMatchCell, RuneMatchCell] | undefined;
  /** Seals the session and releases result delivery. */
  destroy(): void;
}

/** Responsive board layout in scene coordinates. */
export interface RuneMatchBoardLayout {
  /** Left edge of the board. */
  readonly x: number;
  /** Top edge of the board. */
  readonly y: number;
  /** Width of one cell. */
  readonly cellSize: number;
  /** Board width. */
  readonly width: number;
  /** Board height. */
  readonly height: number;
  /** Board row count. */
  readonly rows: number;
  /** Board column count. */
  readonly columns: number;
}

interface InternalState {
  phase: RuneMatchPhase;
  grid: RuneMatchRune[][];
  cursor: RuneMatchCell;
  selectedCell?: RuneMatchCell;
  targetIndex: number;
  attackTimerMs: number;
  player: RuneMatchPlayer;
  monster: RuneMatchMonster;
  turns: number;
  cascades: number;
  lastRemovedCells: RuneMatchCell[];
  lastOutcome?: RuneMatchOutcome;
  refillIndex: number;
  destroyed: boolean;
}

interface SceneGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}

interface SceneTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

interface SceneLike {
  add?: {
    graphics(): SceneGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): SceneTextLike;
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
  game?: {
    readonly canvas?: {
      getBoundingClientRect?(): {
        readonly left: number;
        readonly top?: number;
        readonly width: number;
        readonly height?: number;
      };
    };
  };
  scale?: { readonly width?: number; readonly height?: number };
}

interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: SceneGraphicsLike;
  readonly title: SceneTextLike;
  readonly prompt: SceneTextLike;
  readonly progress: SceneTextLike;
  readonly status: SceneTextLike;
  readonly instructions: SceneTextLike;
  readonly cells: readonly SceneTextLike[];
}

interface SceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: RuneMatchController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
}

function freezeCell(cell: RuneMatchCell): RuneMatchCell {
  return Object.freeze({ row: cell.row, col: cell.col });
}

function freezeGrid(grid: readonly (readonly RuneMatchRune[])[]): readonly (readonly RuneMatchRune[])[] {
  return Object.freeze(grid.map((row) => Object.freeze(row.map((rune) => Object.freeze({ ...rune })))));
}

function cloneGrid(grid: readonly (readonly RuneMatchRune[])[]): RuneMatchRune[][] {
  return grid.map((row) => row.map((rune) => ({ ...rune })));
}

function normalizeSeed(seed: number | undefined): number {
  if (seed === undefined) return 0;
  if (!Number.isFinite(seed)) throw new Error("Rune Match seed must be finite");
  return Math.abs(Math.trunc(seed));
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
  return value;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a nonnegative integer`);
  return value;
}

function runeKey(rune: RuneMatchRune): string {
  return rune.type === "vocabulary" ? `vocabulary:${rune.wordId}` : rune.type;
}

function runeWordId(index: number, item: VocabularyItem): string {
  return `word:${index}:${item.term.trim().toLowerCase()}`;
}

function createVocabularyRune(index: number, item: VocabularyItem, id = `rune:${index}:${item.term}`): VocabularyRune {
  return Object.freeze({
    id,
    type: "vocabulary",
    wordId: runeWordId(index, item),
    term: item.term,
    translation: item.translation,
  });
}

function createPowerRune(type: "heal" | "shield", index: number): RuneMatchRune {
  return Object.freeze({ id: `rune:${type}:${index}`, type });
}

function validateGrid(grid: readonly (readonly RuneMatchRune[])[]): { rows: number; columns: number } {
  if (!Array.isArray(grid) || grid.length === 0) throw new Error("Rune Match grid must not be empty");
  const columns = grid[0]?.length ?? 0;
  if (columns === 0) throw new Error("Rune Match grid must have columns");
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== columns) throw new Error("Rune Match grid must be rectangular");
    for (const rune of row) {
      if (rune.type === "vocabulary") {
        if (!rune.id || !rune.wordId || !rune.term || !rune.translation) {
          throw new Error("Rune Match vocabulary runes need complete language data");
        }
      } else if (rune.type !== "heal" && rune.type !== "shield") {
        throw new Error("Rune Match grid contains an unsupported rune");
      }
    }
  }
  return { rows: grid.length, columns };
}

function isInside(cell: RuneMatchCell, rows: number, columns: number): boolean {
  return Number.isInteger(cell.row) && Number.isInteger(cell.col)
    && cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < columns;
}

/** Returns whether two board cells share one edge. */
export function areRuneCellsAdjacent(first: RuneMatchCell, second: RuneMatchCell): boolean {
  return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

/** Swaps two cells without mutating the source board. */
export function swapRunes(
  grid: readonly (readonly RuneMatchRune[])[],
  first: RuneMatchCell,
  second: RuneMatchCell,
): RuneMatchRune[][] {
  const dimensions = validateGrid(grid);
  if (!isInside(first, dimensions.rows, dimensions.columns) || !isInside(second, dimensions.rows, dimensions.columns)) {
    throw new Error("Rune Match swap cell is outside the board");
  }
  const next = cloneGrid(grid);
  const rune = next[first.row]![first.col]!;
  next[first.row]![first.col] = next[second.row]![second.col]!;
  next[second.row]![second.col] = rune;
  return next;
}

function contiguousSegments(grid: readonly (readonly RuneMatchRune[])[]): RuneMatchCell[][] {
  const { rows, columns } = validateGrid(grid);
  const segments: RuneMatchCell[][] = [];
  for (let row = 0; row < rows; row += 1) {
    let start = 0;
    while (start < columns) {
      const key = runeKey(grid[row]![start]!);
      let end = start + 1;
      while (end < columns && runeKey(grid[row]![end]!) === key) end += 1;
      if (end - start >= 2) {
        segments.push(Array.from({ length: end - start }, (_value, offset) => ({ row, col: start + offset })));
      }
      start = end;
    }
  }
  for (let col = 0; col < columns; col += 1) {
    let start = 0;
    while (start < rows) {
      const key = runeKey(grid[start]![col]!);
      let end = start + 1;
      while (end < rows && runeKey(grid[end]![col]!) === key) end += 1;
      if (end - start >= 2) {
        segments.push(Array.from({ length: end - start }, (_value, offset) => ({ row: start + offset, col })));
      }
      start = end;
    }
  }
  return segments;
}

/** Finds horizontal and vertical groups of two or more matching runes. */
export function findRuneMatchGroups(grid: readonly (readonly RuneMatchRune[])[]): readonly RuneMatchGroup[] {
  const segments = contiguousSegments(grid);
  const groups: RuneMatchGroup[] = [];
  const visited = new Set<number>();
  for (let index = 0; index < segments.length; index += 1) {
    if (visited.has(index)) continue;
    const cells = new Map<string, RuneMatchCell>();
    const queue = [index];
    visited.add(index);
    while (queue.length > 0) {
      const segmentIndex = queue.shift()!;
      const segment = segments[segmentIndex]!;
      for (const cell of segment) cells.set(`${cell.row}:${cell.col}`, cell);
      for (let candidate = 0; candidate < segments.length; candidate += 1) {
        if (visited.has(candidate)) continue;
        if (segments[candidate]!.some((cell) => cells.has(`${cell.row}:${cell.col}`))) {
          visited.add(candidate);
          queue.push(candidate);
        }
      }
    }
    const groupCells = [...cells.values()].sort((first, second) => first.row - second.row || first.col - second.col);
    const firstRune = grid[groupCells[0]!.row]![groupCells[0]!.col]!;
    groups.push(Object.freeze({
      cells: Object.freeze(groupCells.map(freezeCell)),
      coords: Object.freeze(groupCells.map(freezeCell)),
      type: firstRune.type,
      ...(firstRune.type === "vocabulary" ? { wordId: firstRune.wordId } : {}),
      isSpecial: groupCells.length >= 5,
    }));
  }
  return Object.freeze(groups);
}

/** Compatibility alias for the legacy match scanner. */
export function findMatches(grid: readonly (readonly RuneMatchRune[])[]): readonly RuneMatchGroup[] {
  return findRuneMatchGroups(grid);
}

function createFillerRune(index: number, item: VocabularyItem): RuneMatchRune {
  return Object.freeze({
    id: `filler:${index}`,
    type: "vocabulary",
    wordId: `filler:${index}`,
    term: item.term,
    translation: item.translation,
  });
}

function deterministicCandidates(
  vocabulary: readonly VocabularyItem[],
  position: number,
  includePowerRunes: boolean,
): RuneMatchRune[] {
  const candidates: RuneMatchRune[] = vocabulary.map((item, index) => createVocabularyRune(
    index,
    item,
    `rune:${position}:${index}:${item.term}`,
  ));
  if (includePowerRunes || candidates.length < 3) {
    candidates.push(createPowerRune("heal", position));
    candidates.push(createPowerRune("shield", position));
  }
  return candidates;
}

function chooseNoMatchRune(
  candidates: readonly RuneMatchRune[],
  left: RuneMatchRune | undefined,
  above: RuneMatchRune | undefined,
  preferredIndex: number,
): RuneMatchRune {
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(preferredIndex + offset) % candidates.length]!;
    if (runeKey(candidate) !== (left ? runeKey(left) : undefined)
      && runeKey(candidate) !== (above ? runeKey(above) : undefined)) {
      return candidate;
    }
  }
  return candidates[preferredIndex % candidates.length]!;
}

function createNoMatchGrid(
  vocabulary: readonly VocabularyItem[],
  seed: number,
  rows: number,
  columns: number,
  includePowerRunes: boolean,
): RuneMatchRune[][] {
  const grid: RuneMatchRune[][] = [];
  for (let row = 0; row < rows; row += 1) {
    const nextRow: RuneMatchRune[] = [];
    for (let col = 0; col < columns; col += 1) {
      const position = row * columns + col;
      const candidates = deterministicCandidates(vocabulary, position, includePowerRunes);
      nextRow.push(chooseNoMatchRune(
        candidates,
        nextRow[col - 1],
        grid[row - 1]?.[col],
        Math.abs(seed + position) % candidates.length,
      ));
    }
    grid.push(nextRow);
  }
  return grid;
}

function placeTargetMove(
  grid: readonly (readonly RuneMatchRune[])[],
  targetRune: VocabularyRune,
  seed: number,
): RuneMatchRune[][] | undefined {
  const dimensions = validateGrid(grid);
  const triples: Array<readonly [RuneMatchCell, RuneMatchCell, RuneMatchCell]> = [];
  for (let row = 0; row < dimensions.rows; row += 1) {
    for (let col = 0; col < dimensions.columns - 2; col += 1) {
      triples.push([{ row, col }, { row, col: col + 1 }, { row, col: col + 2 }]);
    }
  }
  for (let col = 0; col < dimensions.columns; col += 1) {
    for (let row = 0; row < dimensions.rows - 2; row += 1) {
      triples.push([{ row, col }, { row: row + 1, col }, { row: row + 2, col }]);
    }
  }
  if (triples.length === 0) return undefined;

  for (let offset = 0; offset < triples.length; offset += 1) {
    const [first, middle, last] = triples[(offset + Math.abs(seed)) % triples.length]!;
    const candidate = cloneGrid(grid);
    candidate[first.row]![first.col] = Object.freeze({ ...targetRune, id: `${targetRune.id}:${first.row}:${first.col}` });
    candidate[last.row]![last.col] = Object.freeze({ ...targetRune, id: `${targetRune.id}:${last.row}:${last.col}` });
    if (runeKey(candidate[middle.row]![middle.col]!) === runeKey(targetRune)) continue;
    if (findRuneMatchGroups(candidate).length > 0) continue;
    if (findRuneMatchMove(candidate, targetRune.wordId)) return candidate;
  }
  return undefined;
}

function createGuaranteedTargetGrid(
  targetRune: VocabularyRune,
  seed: number,
  rows: number,
  columns: number,
): RuneMatchRune[][] {
  const grid: RuneMatchRune[][] = Array.from({ length: rows }, (_value, row) => (
    Array.from({ length: columns }, (_innerValue, col) => (
      createPowerRune((row + col + Math.abs(seed)) % 2 === 0 ? "heal" : "shield", row * columns + col)
    ))
  ));
  const first: RuneMatchCell = { row: 0, col: 0 };
  const last: RuneMatchCell = columns >= 3 ? { row: 0, col: 2 } : { row: 2, col: 0 };
  if (columns < 3 && rows < 3) throw new Error("Rune Match board needs a three-cell line for target placement");
  grid[first.row]![first.col] = Object.freeze({ ...targetRune, id: `${targetRune.id}:fallback:0` });
  grid[last.row]![last.col] = Object.freeze({ ...targetRune, id: `${targetRune.id}:fallback:1` });
  return grid;
}

function ensureTargetMove(
  grid: readonly (readonly RuneMatchRune[])[],
  vocabulary: readonly VocabularyItem[],
  targetIndex: number,
  seed: number,
): RuneMatchRune[][] {
  const dimensions = validateGrid(grid);
  if (dimensions.rows < 3 && dimensions.columns < 3) return cloneGrid(grid);
  const targetRune = createVocabularyRune(targetIndex, vocabulary[targetIndex]!);
  const placed = placeTargetMove(grid, targetRune, seed + targetIndex);
  if (placed) return placed;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const regenerated = createNoMatchGrid(
      vocabulary,
      seed + targetIndex * 31 + attempt,
      dimensions.rows,
      dimensions.columns,
      true,
    );
    const regeneratedWithTarget = placeTargetMove(regenerated, targetRune, seed + targetIndex + attempt);
    if (regeneratedWithTarget) return regeneratedWithTarget;
  }

  const fallback = createGuaranteedTargetGrid(targetRune, seed + targetIndex, dimensions.rows, dimensions.columns);
  const fallbackWithTarget = placeTargetMove(fallback, targetRune, seed + targetIndex);
  if (fallbackWithTarget) return fallbackWithTarget;
  throw new Error(`Rune Match could not place target ${targetIndex}`);
}

/** Creates a deterministic board containing language and power runes. */
export function initializeGrid(
  vocabulary: readonly VocabularyItem[],
  options: Pick<RuneMatchOptions, "seed" | "rows" | "columns"> = {},
): RuneMatchRune[][] {
  if (vocabulary.length === 0) throw new Error("Rune Match vocabulary cannot be empty");
  const rows = positiveInteger(options.rows ?? RUNE_MATCH_DEFAULT_ROWS, "Rune Match rows");
  const columns = positiveInteger(options.columns ?? RUNE_MATCH_DEFAULT_COLUMNS, "Rune Match columns");
  const seed = normalizeSeed(options.seed);
  return ensureTargetMove(createNoMatchGrid(vocabulary, seed, rows, columns, true), vocabulary, 0, seed);
}

/** Creates a deterministic board without special runes for focused tests. */
export function initializeEmptyGrid(vocabulary: readonly VocabularyItem[]): RuneMatchRune[][] {
  if (vocabulary.length === 0) throw new Error("Rune Match vocabulary cannot be empty");
  const { rows, columns } = { rows: RUNE_MATCH_DEFAULT_ROWS, columns: RUNE_MATCH_DEFAULT_COLUMNS };
  if (vocabulary.length === 1) {
    const grid: RuneMatchRune[][] = [];
    for (let row = 0; row < rows; row += 1) {
      grid.push(Array.from({ length: columns }, (_value, col) => {
        const position = row * columns + col;
        return position % 3 === 0
          ? createVocabularyRune(0, vocabulary[0]!, `rune:${position}:0:${vocabulary[0]!.term}`)
          : createFillerRune(position, vocabulary[0]!);
      }));
    }
    return grid;
  }
  const grid: RuneMatchRune[][] = [];
  for (let row = 0; row < rows; row += 1) {
    grid.push(Array.from({ length: columns }, (_value, col) => {
      const index = (row + col) % vocabulary.length;
      return createVocabularyRune(index, vocabulary[index]!, `rune:${row * columns + col}:${index}:${vocabulary[index]!.term}`);
    }));
  }
  return grid;
}

/** Finds the first adjacent swap that creates a group for a target word. */
export function findRuneMatchMove(
  grid: readonly (readonly RuneMatchRune[])[],
  targetWordId?: string,
): readonly [RuneMatchCell, RuneMatchCell] | undefined {
  const { rows, columns } = validateGrid(grid);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const first = { row, col };
      const candidates = [
        col + 1 < columns ? { row, col: col + 1 } : undefined,
        row + 1 < rows ? { row: row + 1, col } : undefined,
      ];
      for (const second of candidates) {
        if (!second) continue;
        const groups = findRuneMatchGroups(swapRunes(grid, first, second));
        if (groups.some((group) => group.type === "vocabulary" && (targetWordId === undefined || group.wordId === targetWordId))) {
          return Object.freeze([freezeCell(first), freezeCell(second)]);
        }
      }
    }
  }
  return undefined;
}

/** Finds every adjacent swap that creates at least one board match. */
export function findPossibleMoves(
  grid: readonly (readonly RuneMatchRune[])[],
): readonly { readonly from: RuneMatchCell; readonly to: RuneMatchCell }[] {
  const { rows, columns } = validateGrid(grid);
  const moves: Array<{ readonly from: RuneMatchCell; readonly to: RuneMatchCell }> = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const first = { row, col };
      for (const second of [
        col + 1 < columns ? { row, col: col + 1 } : undefined,
        row + 1 < rows ? { row: row + 1, col } : undefined,
      ]) {
        if (second && findRuneMatchGroups(swapRunes(grid, first, second)).length > 0) {
          moves.push({ from: freezeCell(first), to: freezeCell(second) });
        }
      }
    }
  }
  return Object.freeze(moves);
}

/** Applies deterministic gravity and refill to one removed-cell set. */
export function applyGravity(
  grid: readonly (readonly RuneMatchRune[])[],
  matchedCells: readonly RuneMatchCell[],
  vocabulary: readonly VocabularyItem[],
  options: Pick<RuneMatchOptions, "seed"> = {},
): RuneMatchRune[][] {
  return collapseGrid(grid, matchedCells, vocabulary, normalizeSeed(options.seed), 0).grid;
}

/** Processes all deterministic matches, refills, and cascades on a board. */
export function processMatches(
  grid: readonly (readonly RuneMatchRune[])[],
  vocabulary: readonly VocabularyItem[],
  options: Pick<RuneMatchOptions, "seed"> = {},
): RuneMatchProcessResult {
  const result = processRuneMatchCascades(grid, vocabulary, normalizeSeed(options.seed), 0);
  return Object.freeze({ grid: result.grid, cascades: result.cascades, groups: result.indexedGroups });
}

function normalizeTargetKey(value: string): string {
  return value.trim().toLowerCase();
}

function targetMatches(
  wordId: string | undefined,
  target: VocabularyItem,
  index: number,
  allowLabelFallback: boolean,
): boolean {
  if (!wordId) return false;
  const key = normalizeTargetKey(wordId);
  return key === normalizeTargetKey(runeWordId(index, target))
    || key === `word:${index}`
    || (allowLabelFallback && (key === normalizeTargetKey(target.term) || key === normalizeTargetKey(target.translation)));
}

function damageForGroup(size: number): number {
  if (size <= 2) return 3;
  if (size === 3) return 10;
  if (size === 4) return 20;
  return 30;
}

/** Calculates legacy-compatible monster damage for one rune group. */
export function calculateMatchDamage(runeCount: number, isPowerRune: boolean): number {
  const baseDamage = damageForGroup(runeCount);
  return isPowerRune ? baseDamage * 2 : baseDamage;
}

function collapseGrid(
  grid: readonly (readonly RuneMatchRune[])[],
  removed: readonly RuneMatchCell[],
  vocabulary: readonly VocabularyItem[],
  seed: number,
  refillIndex: number,
): { grid: RuneMatchRune[][]; refillIndex: number } {
  const { rows, columns } = validateGrid(grid);
  const removedKeys = new Set(removed.map((cell) => `${cell.row}:${cell.col}`));
  const next: RuneMatchRune[][] = Array.from({ length: rows }, () => Array(columns));
  let nextRefillIndex = refillIndex;
  const refill = (row: number, col: number): RuneMatchRune => {
    const position = nextRefillIndex;
    nextRefillIndex += 1;
    const candidates = deterministicCandidates(vocabulary, position, true);
    return chooseNoMatchRune(
      candidates,
      next[row]![col - 1],
      next[row + 1]?.[col],
      Math.abs(position + seed) % candidates.length,
    );
  };
  for (let col = 0; col < columns; col += 1) {
    const survivors: RuneMatchRune[] = [];
    for (let row = rows - 1; row >= 0; row -= 1) {
      if (!removedKeys.has(`${row}:${col}`)) survivors.push(grid[row]![col]!);
    }
    for (let row = rows - 1; row >= 0; row -= 1) {
      next[row]![col] = survivors.shift() ?? refill(row, col);
    }
  }
  return { grid: next, refillIndex: nextRefillIndex };
}

interface RuneMatchCascadeResult {
  readonly grid: RuneMatchRune[][];
  readonly groups: readonly RuneMatchGroup[];
  readonly indexedGroups: readonly RuneMatchProcessedGroup[];
  readonly cascades: number;
  readonly refillIndex: number;
}

function processRuneMatchCascades(
  grid: readonly (readonly RuneMatchRune[])[],
  vocabulary: readonly VocabularyItem[],
  seed: number,
  refillIndex: number,
): RuneMatchCascadeResult {
  let currentGrid = cloneGrid(grid);
  let currentRefillIndex = refillIndex;
  let groups = findRuneMatchGroups(currentGrid);
  let cascades = 0;
  const allGroups: RuneMatchGroup[] = [];
  const indexedGroups: RuneMatchProcessedGroup[] = [];
  while (groups.length > 0 && cascades < 100) {
    allGroups.push(...groups);
    indexedGroups.push(...groups.map((group) => Object.freeze({ ...group, cascadeIndex: cascades })));
    const removed = groups.flatMap((group) => group.cells);
    const collapsed = collapseGrid(currentGrid, removed, vocabulary, seed, currentRefillIndex);
    currentGrid = collapsed.grid;
    currentRefillIndex = collapsed.refillIndex;
    cascades += 1;
    groups = findRuneMatchGroups(currentGrid);
  }
  return {
    grid: currentGrid,
    groups: Object.freeze(allGroups),
    indexedGroups: Object.freeze(indexedGroups),
    cascades,
    refillIndex: currentRefillIndex,
  };
}

function actionResult(
  snapshot: RuneMatchSnapshot,
  values: Omit<RuneMatchActionResult, "snapshot" | "completed" | "terminal"> & { terminal?: boolean },
): RuneMatchActionResult {
  const terminal = values.terminal ?? false;
  return Object.freeze({ ...values, terminal, completed: terminal, snapshot });
}

function clonePlayer(player: RuneMatchPlayer): RuneMatchPlayer {
  return Object.freeze({ ...player });
}

function cloneMonster(monster: RuneMatchMonster): RuneMatchMonster {
  return Object.freeze({ ...monster });
}

/** Creates transport-independent Rune Match rules for one vocabulary session. */
export function createRuneMatchController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
  options: RuneMatchOptions = {},
): RuneMatchController {
  const parsedInput = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "vocabulary");
  const vocabulary = content.items;
  const allowLabelFallback = new Set(vocabulary.map((item) => normalizeTargetKey(item.term))).size === vocabulary.length
    && new Set(vocabulary.map((item) => normalizeTargetKey(item.translation))).size === vocabulary.length;
  const seed = normalizeSeed(options.seed);
  const startingPlayerHealth = positiveInteger(options.playerHealth ?? options.playerHp ?? 100, "Rune Match player health");
  const startingPlayerMaxHealth = positiveInteger(options.playerMaxHealth ?? 100, "Rune Match maximum player health");
  if (startingPlayerHealth > startingPlayerMaxHealth) {
    throw new Error("Rune Match player health cannot exceed maximum health");
  }
  const startingMonsterHealth = positiveInteger(
    options.monsterHealth ?? options.monsterHp ?? Math.max(3, vocabulary.length * 3),
    "Rune Match monster health",
  );
  const monsterAttack = nonNegativeInteger(options.monsterAttack ?? 2, "Rune Match monster attack");
  const invalidSwapDamage = nonNegativeInteger(options.invalidSwapDamage ?? 1, "Rune Match invalid swap damage");
  const healAmount = positiveInteger(options.healAmount ?? 5, "Rune Match heal amount");
  const suppliedGrid = options.grid ?? options.initialGrid;
  const grid = suppliedGrid ? cloneGrid(suppliedGrid) : initializeGrid(vocabulary, options);
  const dimensions = validateGrid(grid);
  if (suppliedGrid && findRuneMatchGroups(grid).length > 0) {
    throw new Error("Rune Match initial grid must not contain matches");
  }
  const progression = createLanguageTargetProgression(
    vocabulary.map((_item, index) => runeWordId(index, vocabulary[index]!)),
  );
  let accountant = createResultAccountant();
  const completion = createCompletionLatch(deliver);
  let terminalResultValue: GameResults | undefined;
  const state: InternalState = {
    phase: "playing",
    grid,
    cursor: { row: 0, col: 0 },
    targetIndex: 0,
    attackTimerMs: RUNE_MATCH_ATTACK_INTERVAL_MS,
    player: Object.freeze({
      health: startingPlayerHealth,
      hp: startingPlayerHealth,
      maxHealth: startingPlayerMaxHealth,
      maxHp: startingPlayerMaxHealth,
      hasShield: false,
    }),
    monster: Object.freeze({
      type: "goblin",
      health: startingMonsterHealth,
      hp: startingMonsterHealth,
      maxHealth: startingMonsterHealth,
      maxHp: startingMonsterHealth,
      attack: monsterAttack,
    }),
    turns: 0,
    cascades: 0,
    lastRemovedCells: [],
    refillIndex: 0,
    destroyed: false,
  };

  const target = (): VocabularyItem => vocabulary[Math.min(state.targetIndex, vocabulary.length - 1)]!;
  const ensureCurrentTargetMove = (): void => {
    if (state.targetIndex >= vocabulary.length) return;
    state.grid = ensureTargetMove(state.grid, vocabulary, state.targetIndex, seed);
  };
  const snapshot = (): RuneMatchSnapshot => Object.freeze({
    phase: state.phase,
    status: state.phase,
    seed,
    mechanic: "adjacent-rune-monster-match",
    grid: freezeGrid(state.grid),
    cursor: freezeCell(state.cursor),
    selectedCell: state.selectedCell ? freezeCell(state.selectedCell) : undefined,
    targetIndex: state.targetIndex,
    targetCount: vocabulary.length,
    prompt: target().translation,
    answer: target().term,
    correctAction: "confirm",
    availableActions: RUNE_MATCH_AVAILABLE_ACTIONS,
    attackTimerMs: state.attackTimerMs,
    player: clonePlayer(state.player),
    playerHealth: state.player.health,
    lives: state.player.health,
    energy: state.player.health,
    monster: cloneMonster(state.monster),
    monsterHealth: state.monster.health,
    correctAnswers: accountant.correctAnswers,
    totalAttempts: accountant.totalAttempts,
    score: accountant.score,
    turns: state.turns,
    cascades: state.cascades,
    refillIndex: state.refillIndex,
    lastRemovedCells: Object.freeze(state.lastRemovedCells.map(freezeCell)),
    lastOutcome: state.lastOutcome,
    result: terminalResultValue,
    destroyed: state.destroyed,
  });

  const terminalResult = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const enterTerminal = (phase: "victory" | "defeat"): GameResults => {
    state.phase = phase;
    const result = terminalResult();
    terminalResultValue = result;
    completion.complete(result);
    return result;
  };

  const counterattack = (): { outcome: RuneMatchOutcome; result?: GameResults } => {
    if (state.phase !== "playing") return { outcome: "counterattack" };
    if (state.player.hasShield) {
      state.player = Object.freeze({ ...state.player, hasShield: false });
      state.lastOutcome = "blocked";
      return { outcome: "blocked" };
    }
    state.player = Object.freeze({
      ...state.player,
      health: Math.max(0, state.player.health - state.monster.attack),
      hp: Math.max(0, state.player.health - state.monster.attack),
    });
    state.lastOutcome = "counterattack";
    if (state.player.health === 0) return { outcome: "counterattack", result: enterTerminal("defeat") };
    return { outcome: "counterattack" };
  };

  const finishTurn = (
    values: Omit<RuneMatchActionResult, "snapshot" | "terminal" | "completed" | "turnCompleted">,
  ): RuneMatchActionResult => {
    state.turns += 1;
    return actionResult(snapshot(), {
      ...values,
      turnCompleted: true,
      outcome: values.outcome,
      terminal: state.phase !== "playing",
    });
  };

  const restoreProgress = (targetIndex: number): void => {
    progression.reset();
    for (let index = 0; index < targetIndex; index += 1) progression.match(runeWordId(index, vocabulary[index]!));
  };

  const restore = (restored: RuneMatchSnapshot): void => {
    if (state.destroyed) return;
    if (!restored || typeof restored !== "object") throw new Error("Rune Match responsive state must be an object");
    if (restored.phase !== "playing" && restored.phase !== "victory" && restored.phase !== "defeat") {
      throw new Error("Rune Match responsive state phase is invalid");
    }
    if (restored.status !== restored.phase) throw new Error("Rune Match responsive state status is invalid");
    if (restored.seed !== seed) throw new Error("Rune Match responsive state seed is invalid");
    if (restored.mechanic !== "adjacent-rune-monster-match") throw new Error("Rune Match mechanic is invalid");
    const restoredDimensions = validateGrid(restored.grid);
    if (restoredDimensions.rows !== dimensions.rows || restoredDimensions.columns !== dimensions.columns) {
      throw new Error("Rune Match responsive state has invalid board dimensions");
    }
    if (findRuneMatchGroups(restored.grid).length > 0) {
      throw new Error("Rune Match responsive state contains unresolved matches");
    }
    if (!isInside(restored.cursor, dimensions.rows, dimensions.columns)) throw new Error("Rune Match cursor is invalid");
    if (restored.selectedCell && !isInside(restored.selectedCell, dimensions.rows, dimensions.columns)) {
      throw new Error("Rune Match selected cell is invalid");
    }
    if (!Number.isInteger(restored.targetIndex) || restored.targetIndex < 0 || restored.targetIndex > vocabulary.length) {
      throw new Error("Rune Match target index is invalid");
    }
    if (restored.targetCount !== vocabulary.length) throw new Error("Rune Match target count is invalid");
    const restoredTarget = vocabulary[Math.min(restored.targetIndex, vocabulary.length - 1)]!;
    if (restored.prompt !== restoredTarget.translation || restored.answer !== restoredTarget.term) {
      throw new Error("Rune Match target content is invalid");
    }
    if (restored.correctAction !== "confirm") throw new Error("Rune Match correct action is invalid");
    if (restored.availableActions.length !== RUNE_MATCH_AVAILABLE_ACTIONS.length
      || restored.availableActions.some((action, index) => action !== RUNE_MATCH_AVAILABLE_ACTIONS[index])) {
      throw new Error("Rune Match available actions are invalid");
    }
    if (!Number.isFinite(restored.attackTimerMs) || restored.attackTimerMs < 0
      || restored.attackTimerMs > RUNE_MATCH_ATTACK_INTERVAL_MS) {
      throw new Error("Rune Match attack timer is invalid");
    }
    if (!Number.isInteger(restored.correctAnswers) || restored.correctAnswers < 0 || restored.correctAnswers > restored.totalAttempts
      || restored.correctAnswers !== restored.targetIndex) {
      throw new Error("Rune Match result counters are invalid");
    }
    if (!Number.isInteger(restored.totalAttempts) || restored.totalAttempts < 0) throw new Error("Rune Match attempts are invalid");
    if (!Number.isInteger(restored.score) || restored.score < 0 || restored.score !== restored.correctAnswers * 100) {
      throw new Error("Rune Match score is invalid");
    }
    if (!Number.isInteger(restored.turns) || restored.turns < 0) throw new Error("Rune Match turns are invalid");
    if (!Number.isInteger(restored.cascades) || restored.cascades < 0) throw new Error("Rune Match cascades are invalid");
    if (!Number.isInteger(restored.refillIndex) || restored.refillIndex < 0) throw new Error("Rune Match refill index is invalid");
    if (restored.player.health < 0 || restored.player.health > startingPlayerMaxHealth
      || restored.player.hp !== restored.player.health
      || restored.player.maxHealth !== startingPlayerMaxHealth
      || restored.player.maxHp !== startingPlayerMaxHealth
      || restored.playerHealth !== restored.player.health
      || restored.lives !== restored.player.health
      || restored.energy !== restored.player.health
      || typeof restored.player.hasShield !== "boolean") {
      throw new Error("Rune Match player state is invalid");
    }
    if (restored.monster.health < 0 || restored.monster.health > startingMonsterHealth
      || restored.monster.hp !== restored.monster.health
      || restored.monster.maxHealth !== startingMonsterHealth
      || restored.monster.maxHp !== startingMonsterHealth
      || restored.monsterHealth !== restored.monster.health
      || restored.monster.type !== "goblin"
      || restored.monster.attack !== monsterAttack) {
      throw new Error("Rune Match monster state is invalid");
    }
    if (restored.lastOutcome !== undefined && ![
      "selected", "match", "heal", "shield", "invalid-swap", "counterattack", "blocked",
    ].includes(restored.lastOutcome)) {
      throw new Error("Rune Match responsive state outcome is invalid");
    }
    if (restored.lastRemovedCells.some((cell) => !isInside(cell, dimensions.rows, dimensions.columns))) {
      throw new Error("Rune Match removed cells are invalid");
    }
    if (typeof restored.destroyed !== "boolean") throw new Error("Rune Match destroyed state is invalid");
    const restoredResult = restored.result === undefined ? undefined : gameResultsSchema.parse(restored.result);
    if (restored.phase === "playing" && restoredResult !== undefined) {
      throw new Error("Rune Match active state has a terminal result");
    }
    if (restored.phase !== "playing" && restoredResult === undefined) {
      throw new Error("Rune Match terminal state omits its result");
    }
    if (restoredResult && (restoredResult.correctAnswers !== restored.correctAnswers
      || restoredResult.totalAttempts !== restored.totalAttempts
      || restoredResult.score !== restored.score
      || restoredResult.accuracy !== (restored.totalAttempts === 0
        ? 0
        : restored.correctAnswers / restored.totalAttempts)
      || restoredResult.xp !== (restored.totalAttempts === 0
        ? 0
        : Math.floor(restored.correctAnswers * 20 + restored.correctAnswers / restored.totalAttempts * 10)))) {
      throw new Error("Rune Match terminal result is inconsistent");
    }
    if (restored.phase === "playing" && (restored.player.health === 0 || restored.targetIndex === vocabulary.length)) {
      throw new Error("Rune Match playing state is terminal");
    }
    if (restored.phase === "victory" && (restored.targetIndex !== vocabulary.length || restored.player.health === 0)) {
      throw new Error("Rune Match victory state has unfinished targets");
    }
    if (restored.phase === "defeat" && restored.player.health !== 0) {
      throw new Error("Rune Match defeat state has player health");
    }
    restoreProgress(restored.targetIndex);
    accountant = createResultAccountant();
    for (let index = 0; index < restored.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < restored.correctAnswers });
    }
    accountant.addScore(restored.score);
    state.phase = restored.phase;
    state.grid = cloneGrid(restored.grid);
    state.cursor = { ...restored.cursor };
    state.selectedCell = restored.selectedCell ? { ...restored.selectedCell } : undefined;
    state.targetIndex = restored.targetIndex;
    state.attackTimerMs = restored.attackTimerMs;
    state.player = Object.freeze({ ...restored.player });
    state.monster = Object.freeze({ ...restored.monster });
    state.turns = restored.turns;
    state.cascades = restored.cascades;
    state.refillIndex = restored.refillIndex;
    state.lastRemovedCells = restored.lastRemovedCells.map((cell) => ({ ...cell }));
    state.lastOutcome = restored.lastOutcome;
    terminalResultValue = restoredResult;
    state.destroyed = restored.destroyed;
    if (state.destroyed || state.phase !== "playing") completion.sealWithoutDelivery();
  };

  const moveCursor = (direction: RuneMatchDirection): RuneMatchActionResult => {
    const before = snapshot();
    if (state.destroyed || state.phase !== "playing") {
      return actionResult(before, { accepted: false, correct: false, progressed: false, turnCompleted: false });
    }
    const deltas: Record<RuneMatchDirection, RuneMatchCell> = {
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
    };
    const delta = deltas[direction];
    const next = { row: state.cursor.row + delta.row, col: state.cursor.col + delta.col };
    state.cursor = {
      row: Math.max(0, Math.min(dimensions.rows - 1, next.row)),
      col: Math.max(0, Math.min(dimensions.columns - 1, next.col)),
    };
    return actionResult(snapshot(), {
      accepted: state.cursor.row !== before.cursor.row || state.cursor.col !== before.cursor.col,
      correct: false,
      progressed: false,
      turnCompleted: false,
      outcome: "selected",
    });
  };

  const selectCell = (cell: RuneMatchCell): RuneMatchActionResult => {
    const before = snapshot();
    if (state.destroyed || state.phase !== "playing" || !isInside(cell, dimensions.rows, dimensions.columns)) {
      return actionResult(before, { accepted: false, correct: false, progressed: false, turnCompleted: false });
    }
    state.cursor = { ...cell };
    if (!state.selectedCell) {
      state.selectedCell = { ...cell };
      state.lastOutcome = "selected";
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        turnCompleted: false,
        outcome: "selected",
      });
    }
    if (state.selectedCell.row === cell.row && state.selectedCell.col === cell.col) {
      state.selectedCell = undefined;
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        turnCompleted: false,
        outcome: "selected",
      });
    }
    const first = state.selectedCell;
    state.selectedCell = undefined;
    if (!areRuneCellsAdjacent(first, cell)) {
      state.selectedCell = { ...cell };
      state.lastOutcome = "selected";
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        turnCompleted: false,
        outcome: "selected",
      });
    }

    const swappedGrid = swapRunes(state.grid, first, cell);
    const initialGroups = findRuneMatchGroups(swappedGrid);
    const cascaded = processRuneMatchCascades(swappedGrid, vocabulary, seed, state.refillIndex);
    const groups = cascaded.groups;
    const currentTarget = target();
    const targetGroup = initialGroups.find((group) => group.type === "vocabulary"
      && targetMatches(group.wordId, currentTarget, state.targetIndex, allowLabelFallback));
    const vocabularyGroups = groups.filter((group) => group.type === "vocabulary");
    const powerGroups = groups.filter((group) => group.type === "heal" || group.type === "shield");
    if (groups.length === 0) {
      state.grid = ensureTargetMove(swappedGrid, vocabulary, state.targetIndex, seed);
      state.cascades = 0;
      state.lastRemovedCells = [];
      state.lastOutcome = "invalid-swap";
      accountant.recordAttempt({ correct: false });
      state.player = Object.freeze({
        ...state.player,
        health: Math.max(0, state.player.health - invalidSwapDamage),
        hp: Math.max(0, state.player.health - invalidSwapDamage),
      });
      if (state.player.health === 0) {
        const result = enterTerminal("defeat");
        return finishTurn({ accepted: true, correct: false, progressed: false, outcome: "invalid-swap", result });
      }
      return finishTurn({ accepted: true, correct: false, progressed: false, outcome: "invalid-swap" });
    }

    state.grid = cascaded.grid;
    state.refillIndex = cascaded.refillIndex;
    state.cascades = cascaded.cascades;
    state.lastRemovedCells = [...new Map(
      groups.flatMap((group) => group.cells).map((cell) => [`${cell.row}:${cell.col}`, { ...cell }]),
    ).values()];
    accountant.recordAttempt({ correct: Boolean(targetGroup) });
    let outcome: RuneMatchOutcome = "match";
    let progressed = false;
    if (targetGroup) {
      const match = progression.match(runeWordId(state.targetIndex, currentTarget));
      progressed = match.progressed;
      state.targetIndex = progression.currentIndex;
      accountant.addScore(100);
    }
    if (powerGroups.some((group) => group.type === "heal")) {
      const healCount = powerGroups
        .filter((group) => group.type === "heal")
        .reduce((total, group) => total + group.cells.length, 0);
      state.player = Object.freeze({
        ...state.player,
        health: Math.min(state.player.maxHealth, state.player.health + healCount * healAmount),
        hp: Math.min(state.player.maxHealth, state.player.health + healCount * healAmount),
      });
      outcome = "heal";
    }
    if (powerGroups.some((group) => group.type === "shield")) {
      state.player = Object.freeze({ ...state.player, hasShield: true });
      outcome = "shield";
    }
    if (!targetGroup) {
      state.player = Object.freeze({
        ...state.player,
        health: Math.max(0, state.player.health - invalidSwapDamage),
        hp: Math.max(0, state.player.health - invalidSwapDamage),
      });
    }
    if (targetGroup && vocabularyGroups.length > 0) {
      const damage = vocabularyGroups.reduce((total, group) => total + damageForGroup(group.cells.length), 0);
      state.monster = Object.freeze({
        ...state.monster,
        health: Math.max(0, state.monster.health - damage),
        hp: Math.max(0, state.monster.health - damage),
      });
    }
    state.lastOutcome = outcome;
    if (state.player.health === 0) {
      const result = enterTerminal("defeat");
      return finishTurn({ accepted: true, correct: false, progressed: false, outcome, result });
    }
    if (state.targetIndex === vocabulary.length) {
      const result = enterTerminal("victory");
      return finishTurn({ accepted: true, correct: true, progressed, outcome, result });
    }
    ensureCurrentTargetMove();
    return finishTurn({ accepted: true, correct: Boolean(targetGroup), progressed, outcome });
  };

  const advanceTurn = (): RuneMatchActionResult => {
    const before = snapshot();
    if (state.destroyed || state.phase !== "playing") {
      return actionResult(before, { accepted: false, correct: false, progressed: false, turnCompleted: false });
    }
    state.turns += 1;
    const attack = counterattack();
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      turnCompleted: true,
      outcome: attack.outcome,
      terminal: state.phase !== "playing",
      ...(attack.result ? { result: attack.result } : {}),
    });
  };

  const advanceTime = (deltaMs: number): RuneMatchActionResult => {
    const before = snapshot();
    if (state.destroyed || state.phase !== "playing") {
      return actionResult(before, { accepted: false, correct: false, progressed: false, turnCompleted: false });
    }
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Rune Match time delta must be nonnegative and finite");

    let remaining = deltaMs;
    let attack: { outcome: RuneMatchOutcome; result?: GameResults } | undefined;
    while (remaining >= state.attackTimerMs && state.phase === "playing") {
      remaining -= state.attackTimerMs;
      state.attackTimerMs = RUNE_MATCH_ATTACK_INTERVAL_MS;
      attack = counterattack();
    }
    state.attackTimerMs = Math.max(0, state.attackTimerMs - remaining);

    return actionResult(snapshot(), {
      accepted: deltaMs > 0,
      correct: false,
      progressed: false,
      turnCompleted: false,
      ...(attack ? { outcome: attack.outcome } : {}),
      terminal: state.phase !== "playing",
      ...(attack?.result ? { result: attack.result } : {}),
    });
  };

  const controller: RuneMatchController = {
    snapshot,
    moveCursor,
    selectCell,
    choose(action: InputActionId): RuneMatchActionResult {
      if (action === "move-left") return moveCursor("left");
      if (action === "move-right") return moveCursor("right");
      if (action === "move-up") return moveCursor("up");
      if (action === "move-down") return moveCursor("down");
      if (action === "confirm") return selectCell(state.cursor);
      return actionResult(snapshot(), { accepted: false, correct: false, progressed: false, turnCompleted: false });
    },
    advanceTurn,
    advanceTime,
    applyHazard: advanceTurn,
    capture: snapshot,
    restore,
    findValidMove: () => {
      const current = target();
      return findRuneMatchMove(state.grid, runeWordId(state.targetIndex, current));
    },
    destroy(): void {
      if (state.destroyed) return;
      state.destroyed = true;
      completion.sealWithoutDelivery();
    },
  };
  return Object.freeze(controller);
}

/** Calculates the responsive board rectangle for a Rune Match scene. */
export function getRuneMatchBoardLayout(
  width: number,
  height: number,
  rows: number,
  columns: number,
): RuneMatchBoardLayout {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const sidePanel = safeWidth >= 720 ? Math.min(250, safeWidth * 0.27) : 0;
  const availableWidth = safeWidth - sidePanel - 32;
  const availableHeight = safeHeight - (sidePanel === 0 ? 190 : 120);
  const cellSize = Math.max(24, Math.min(availableWidth / columns, availableHeight / rows));
  const boardWidth = cellSize * columns;
  const boardHeight = cellSize * rows;
  return Object.freeze({
    x: sidePanel === 0 ? (safeWidth - boardWidth) / 2 : sidePanel + (safeWidth - sidePanel - boardWidth) / 2,
    y: sidePanel === 0 ? 155 : 112,
    cellSize,
    width: boardWidth,
    height: boardHeight,
    rows,
    columns,
  });
}

/** Maps client-space pointer coordinates to a board cell. */
export function chooseRuneMatchCellFromPointer(
  pointerX: number,
  pointerY: number,
  layout: RuneMatchBoardLayout,
): RuneMatchCell | undefined {
  const col = Math.floor((pointerX - layout.x) / layout.cellSize);
  const row = Math.floor((pointerY - layout.y) / layout.cellSize);
  if (row < 0 || row >= layout.rows || col < 0 || col >= layout.columns) return undefined;
  return Object.freeze({ row, col });
}

function sceneDimensions(scene: SceneLike): { width: number; height: number } {
  return {
    width: scene.scale?.width ?? RUNE_MATCH_CANVAS.width,
    height: scene.scale?.height ?? RUNE_MATCH_CANVAS.height,
  };
}

function pointerInScene(
  scene: SceneLike,
  x: number,
  y: number,
  width: number,
  height: number,
  rows: number,
  columns: number,
): RuneMatchCell | undefined {
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  const localX = rect && rect.width > 0 ? (x - rect.left) * (width / rect.width) : x;
  const localY = rect && (rect.height ?? 0) > 0
    ? (y - (rect.top ?? 0)) * (height / (rect.height ?? height))
    : y;
  return chooseRuneMatchCellFromPointer(localX, localY, getRuneMatchBoardLayout(
    width,
    height,
    rows,
    columns,
  ));
}

function createScene(context: SceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  let animationMs = 0;
  let cleaned = false;
  const normalize = createInputActionNormalizer({
    keyboard: RUNE_MATCH_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 3000;
  });

  const updateView = (scene: SceneLike): void => {
    if (!resources || !scene.add) return;
    const { width, height } = sceneDimensions(scene);
    const state = context.controller.snapshot();
    const rows = state.grid.length;
    const columns = state.grid[0]?.length ?? 1;
    const layout = getRuneMatchBoardLayout(width, height, rows, columns);
    const pulse = Math.sin(animationMs / 3000 * Math.PI * 2) * 3;
    resources.graphics.clear();
    if (!resources.art.ground("world:ground", width, height)) resources.graphics.fillStyle(0x090d24, 1).fillRect(0, 0, width, height);
    resources.graphics.fillStyle(0x151f47, 0.96).fillRoundedRect(18, 12, width - 36, height - 24, 22);
    const monsterX = width >= 720 ? width * 0.14 : width * 0.18;
    const monsterY = height * 0.3;
    if (!resources.art.place("monster", "enemy:idle", {
      x: monsterX,
      y: monsterY,
      width: 104 + pulse * 2,
      depth: 7,
      alpha: state.monster.health === 0 ? 0.35 : 1,
    })) {
      resources.graphics.fillStyle(0x45266e, 0.9).fillCircle(monsterX, monsterY, 52 + pulse);
      resources.graphics.fillStyle(0xd85c76, 0.9).fillCircle(monsterX, monsterY, 25 + pulse / 2);
    }
    resources.art.place("player", "player:idle", {
      x: monsterX,
      y: height * 0.62,
      width: 72,
      depth: 8,
      alpha: state.player.hasShield ? 1 : 0.92,
    });
    resources.art.sweep();
    const healthRatio = state.monster.maxHealth === 0 ? 0 : state.monster.health / state.monster.maxHealth;
    resources.graphics.fillStyle(0x301b3f, 1).fillRoundedRect(30, height * 0.42, Math.min(180, width * 0.22), 12, 6);
    resources.graphics.fillStyle(0xf15b74, 1).fillRoundedRect(30, height * 0.42, Math.min(180, width * 0.22) * healthRatio, 12, 6);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const rune = state.grid[row]![col]!;
        const x = layout.x + col * layout.cellSize;
        const y = layout.y + row * layout.cellSize;
        const selected = state.selectedCell?.row === row && state.selectedCell.col === col;
        const cursor = state.cursor.row === row && state.cursor.col === col;
        const color = rune.type === "vocabulary" ? 0x2b79a7 : rune.type === "heal" ? 0x2b9b70 : 0x4f75c9;
        resources.graphics.fillStyle(color, 0.96).fillRoundedRect(x + 2, y + 2, layout.cellSize - 4, layout.cellSize - 4, 8);
        if (cursor || selected) {
          resources.graphics.lineStyle(selected ? 5 : 3, selected ? 0xffd166 : 0xffffff, 0.95)
            .strokeRoundedRect(x + 2, y + 2, layout.cellSize - 4, layout.cellSize - 4, 8);
        }
        const label = rune.type === "vocabulary" ? rune.term : rune.type === "heal" ? "+" : "◈";
        resources.cells[row * columns + col]?.setText(label).setPosition(x + 8, y + layout.cellSize * 0.35);
      }
    }
    resources.title.setText("RUNE MATCH").setPosition(30, 28);
    resources.prompt.setText(`Match the rune for: ${state.prompt}`).setPosition(30, 66);
    resources.progress.setText(
      `${composition?.profile === "compact" ? "Compact board" : "Rune board"}  •  Target ${Math.min(state.targetIndex + 1, state.targetCount)} of ${state.targetCount}  •  Attempts ${state.totalAttempts}`,
    ).setPosition(30, 100);
    resources.status.setText(
      state.phase === "victory"
        ? "Every target rune matched! Victory!"
        : state.phase === "defeat"
          ? "Your runes are spent."
          : `Player ${state.player.health}/${state.player.maxHealth}${state.player.hasShield ? "  Shielded" : ""}  •  Monster ${state.monster.health}/${state.monster.maxHealth}`,
    ).setPosition(30, height - 72);
    resources.instructions.setText(
      "Keyboard: arrows/WASD move • Enter or Space selects • Tap two adjacent runes",
    ).setPosition(30, height - 40);
  };

  const perform = (result: RuneMatchActionResult): void => {
    if (!result.accepted || !result.turnCompleted) return;
    context.diagnostic({
      level: "info",
      code: result.terminal ? "RUNE_MATCH_TERMINAL" : "RUNE_MATCH_TURN",
      message: result.terminal ? "Rune Match reached a terminal state." : "Rune Match processed a board turn.",
      details: {
        correct: result.correct,
        outcome: result.outcome,
        attempts: result.snapshot.totalAttempts,
      },
    });
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    frameScheduler.cancel();
    context.inputController.cancelActiveGesture();
    context.controller.destroy();
    if (!resources) return;
    const activeResources = resources;
    resources = undefined;
    activeResources.graphics.destroy();
    activeResources.title.destroy();
    activeResources.prompt.destroy();
    activeResources.progress.destroy();
    activeResources.status.destroy();
    activeResources.instructions.destroy();
    for (const cell of activeResources.cells) cell.destroy();
    previousKeys = new Set<string>();
  };


  const artKeys = ["world:ground", "player:idle", "enemy:idle"] as const;

  const preload = function (this: SceneLike): void {
    if (!this.load) return;
    preloadAssetBindings(
      this.load,
      context.edition,
      artKeys.filter((key) => context.edition.bindings[key]),
    );
  };

  const create = function (this: SceneLike): void {
    if (!this.add) throw new Error("Rune Match requires Phaser display services");
    const style = { fontFamily: "Arial", color: "#f8fbff", fontSize: "18px" };
    const state = context.controller.snapshot();
    const cellCount = state.grid.length * (state.grid[0]?.length ?? 1);
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(0, 0, "", { ...style, fontSize: "30px", fontStyle: "bold" }),
      prompt: this.add.text(0, 0, "", { ...style, fontSize: "23px" }),
      progress: this.add.text(0, 0, "", { ...style, fontSize: "16px", color: "#b7ccff" }),
      status: this.add.text(0, 0, "", { ...style, fontSize: "17px", color: "#ffd166" }),
      instructions: this.add.text(0, 0, "", { ...style, fontSize: "15px", color: "#c7d2fe" }),
      cells: Array.from({ length: cellCount }, () => this.add!.text(0, 0, "", { ...style, fontSize: "16px" })),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: SceneLike, _time = 0, delta = 0): void {
    if (!resources) return;
    frameScheduler.tick(delta);
    if (context.sessionMode === "playing") {
      perform(context.controller.advanceTime(delta));
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action) {
          if (action === "confirm") perform(context.controller.choose(action));
          else perform(context.controller.choose(action));
        }
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const pointerState = context.controller.snapshot();
        const pointerAction = normalize({
          modality: "pointer",
          phase: "up",
          x: input.pointer.x,
          y: input.pointer.y,
        })[0]?.action;
        const pointer = pointerInScene(
          this,
          input.pointer.x,
          input.pointer.y,
          sceneDimensions(this).width,
          sceneDimensions(this).height,
          pointerState.grid.length,
          pointerState.grid[0]?.length ?? 1,
        );
        if (pointer && pointerAction === "confirm") perform(context.controller.selectCell(pointer));
      }
    }
    updateView(this);
  };

  return {
    key: RUNE_MATCH_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (value: unknown) => {
        if (typeof value !== "object" || value === null) throw new Error("Rune Match responsive state is invalid");
        context.controller.restore(value as RuneMatchSnapshot);
      },
      apkRecompose: (nextComposition: SceneContext["composition"]) => {
        composition = nextComposition;
      },
    },
  };
}

/** Creates the bespoke Rune Match Phaser cartridge. */
export function createRuneMatchCartridge(): StandardExperienceCartridge {
  let activeController: RuneMatchController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: RUNE_MATCH_ID,
    title: "Rune Match",
    description: "Match adjacent vocabulary runes to defeat a monster.",
    inputMode: "vocabulary",
    objective: "Match each target rune while protecting the player from counterattacks.",
    mechanicInstruction: "Move the cursor or tap two adjacent runes to make a language match.",
    keyboardKeys: ["WASD", "Arrow keys", "Enter", "Space", "Tap", "Click"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const move = controller.findValidMove();
      if (!move) return;
      const [first, second] = move;
      if (actionId === "action:select-correct") {
        controller.selectCell(first);
        controller.selectCell(second);
      } else {
        controller.selectCell(first);
        controller.selectCell({ row: first.row, col: Math.min(first.col + 2, controller.snapshot().grid[0]!.length - 1) });
      }
    },
  });
  return {
    manifest: {
      id: RUNE_MATCH_ID,
      title: "Rune Match",
      description: "Match adjacent vocabulary runes to defeat a monster.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["rune-match/monster-rune-board"],
      capabilities: [
        "capability:deterministic-rune-board",
        "capability:cursor-and-pointer-selection",
        "capability:language-target-progression",
        "capability:monster-counterattack",
        "capability:power-rune-effects",
        "capability:result-accounting",
        "capability:single-completion-emission",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createRuneMatchController(
        input,
        sessionMode === "playing"
          ? (result) => context.complete(result, controller.snapshot().phase === "victory" ? "victory" : "defeat")
          : () => undefined,
        { seed: context.seed },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "RUNE_MATCH_READY",
        message: "Rune Match board is ready.",
        details: { editionId: context.edition.id, targetCount: input.length },
      });
      return {
        width: RUNE_MATCH_CANVAS.width,
        height: RUNE_MATCH_CANVAS.height,
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
