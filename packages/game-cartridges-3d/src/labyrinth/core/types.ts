/**
 * Labyrinth of the Goblin King rules core: state, commands, and events (section 6 of
 * docs/game-labyrinth-3d.md). The maze is a grid of cells with walls on the cell edges; every
 * mover is at a cell or between a cell and its `next` cell with `progress` 0 to 1. The view
 * draws positions from `positionOf()` (cell units; one cell is `CELL_M` meters), so movement is
 * smooth at any frame rate. Every event carries ids, never references.
 */

// ---------------------------------------------------------------- grid

export type Dir = 'up' | 'down' | 'left' | 'right';

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

/** A cell: `col` grows to +X; `row` grows down the map (`up` is `row - 1`). */
export interface Cell {
  col: number;
  row: number;
}

/** The walls of one cell: true where a wall closes that edge. */
export type CellWalls = Record<Dir, boolean>;

/** One wall edge of the maze, once per shared edge (the view places one wall model per entry). */
export interface WallEdge {
  cell: Cell;
  side: Dir;
}

export interface Maze {
  id: string;
  rows: number;
  cols: number;
  /** Walls per cell, indexed `row * cols + col`. */
  walls: CellWalls[];
  start: Cell;
  /** Goblin dens: goblins start here and return here after a bump. */
  dens: Cell[];
  /** The gate cell (on the border) and the border side the gate is in. */
  gate: Cell;
  gateSide: Dir;
}

/** The side of a cell in meters (the dungeon wall model is built for this). */
export const CELL_M = 2;

// ---------------------------------------------------------------- state

/** Anything that walks the grid: at `cell` (`next` null, `progress` 0) or on the way to `next`. */
export interface Mover {
  cell: Cell;
  next: Cell | null;
  /** 0 at `cell`, 1 at `next`. */
  progress: number;
  /** The facing; null before the first step. */
  dir: Dir | null;
}

export interface Hero extends Mover {
  /** The queued direction; taken at the first cell that allows it. */
  queued: Dir | null;
  /** True after a `stop` command until the hero stops at the next cell. */
  stopping: boolean;
  /** Milliseconds left during which a goblin cannot bump the hero. */
  safeMs: number;
  /** Where a bump sends the hero: the last crossing (3 or more exits) the hero walked through. */
  lastCrossing: Cell;
}

export interface Goblin extends Mover {
  id: string;
  den: Cell;
  /** True while the goblin walks home after a bump; it neither chases nor bumps. */
  returning: boolean;
  /** Milliseconds left of the rest in the den after a return; a resting goblin neither moves nor touches. */
  restMs: number;
  /** True during the aura and while the gate is open; the goblin runs from the hero. */
  fleeing: boolean;
}

export interface Orb {
  id: string;
  word: string;
  cell: Cell;
}

/** One sentence of the shift and its reading record. */
export interface ShiftSentence {
  /** The sentence id from the story (the evidence `itemId`). */
  id: string;
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  paragraph?: number;
  /** Wrong orbs taken in this sentence (attempts beyond the first). */
  wrong: number;
  /** True once the hero took any orb of this sentence. */
  started: boolean;
  /** True once every word was taken in order. */
  built: boolean;
}

export interface LabyrinthState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  maze: Maze;
  /** The shift: every sentence in order. */
  shift: ShiftSentence[];
  /** The index of the current sentence in `shift`. */
  sentence: number;
  /** `shift.length`. */
  sentences: number;
  /** The index of the next word to take in the current sentence. */
  next: number;
  hero: Hero;
  goblins: Goblin[];
  orbs: Orb[];
  /** Orb waves placed so far (orb ids are `o<wave>-<n>`). */
  wave: number;
  /** Milliseconds of aura left (0 = none). */
  auraMs: number;
  /** True after the last sentence; the hero walks to the gate. */
  gateOpen: boolean;
  coins: number;
  /** Right orbs taken, sentences built, and goblins caught in the shift. */
  wordsTaken: number;
  sentencesBuilt: number;
  goblinsCaught: number;
}

// ---------------------------------------------------------------- commands

export type LabyrinthCommand =
  /** Queue the next direction: the hero turns at the first cell that allows it (at once when it is the reverse). */
  | { type: 'turn'; dir: Dir }
  /** Stop at the next cell. */
  | { type: 'stop' };

// ---------------------------------------------------------------- events

export interface OrbSpawn {
  id: string;
  word: string;
  cell: Cell;
}

export type LabyrinthEvent =
  | { type: 'sentenceStarted'; sentenceId: string; words: string[]; orbs: OrbSpawn[] }
  /** A right orb: the word joins the sentence. */
  | { type: 'orbTaken'; id: string; index: number }
  /** A wrong orb: it fizzles and counts an attempt; `orbsMoved` follows. */
  | { type: 'orbWrong'; id: string }
  /** The same orbs at new cells (after a wrong orb). */
  | { type: 'orbsMoved'; orbs: { id: string; cell: Cell }[] }
  /** New orbs for the next word of the sentence. */
  | { type: 'orbsPlaced'; orbs: OrbSpawn[] }
  /** A goblin touched the hero: the hero is back at `cell` (the last crossing), safe for a moment. */
  | { type: 'heroBumped'; goblinId: string; cell: Cell }
  /** The goblin is back in its den. */
  | { type: 'goblinReturned'; goblinId: string; cell: Cell }
  /** The sentence is built; the aura starts. */
  | { type: 'sentenceComplete'; sentenceId: string }
  /** The glowing hero touched a goblin: coins, and the goblin is sent to its den. */
  | { type: 'goblinCaught'; goblinId: string; coins: number }
  | { type: 'auraEnded' }
  | { type: 'gateOpened'; cell: Cell }
  | { type: 'shiftComplete'; sentences: number };

export type LabyrinthEventType = LabyrinthEvent['type'];

/** Every event type the core emits; there is no game over. */
export const LABYRINTH_EVENT_TYPES: readonly LabyrinthEventType[] = [
  'sentenceStarted',
  'orbTaken',
  'orbWrong',
  'orbsMoved',
  'orbsPlaced',
  'heroBumped',
  'goblinReturned',
  'sentenceComplete',
  'goblinCaught',
  'auraEnded',
  'gateOpened',
  'shiftComplete',
];
