/**
 * Realm Carver 3D rules core: state, commands, and events (section 6 of
 * docs/game-realm-carver-3d.md). The board is a square of cells: `col` grows to +X and `row`
 * grows to +Z (toward the camera), so `up` is away from the camera. The view reads the state
 * every frame and animates from the events; every event carries ids, never references.
 */

/** Cells on each side of the board. The outer ring starts claimed; the inside starts wild. */
export const BOARD_SIZE = 12;

/** Monster models of the wild: they bounce over unclaimed land. */
export const MONSTER_KINDS = ['slime', 'goblin-warrior', 'bandit'] as const;

export type MonsterKind = (typeof MONSTER_KINDS)[number];

export type CellState = 'wild' | 'claimed' | 'trail';

export interface Cell {
  col: number;
  row: number;
}

export type Dir = 'up' | 'down' | 'left' | 'right';

/** The step of each direction in cells. */
export const DIR_STEP: Readonly<Record<Dir, Readonly<{ dc: number; dr: number }>>> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

// ---------------------------------------------------------------- state

/** One realm of the campaign: a sentence and its reading record. */
export interface RealmSentence {
  /** The sentence id from the story (the evidence `itemId`). */
  id: string;
  /** The realm id: `realm-1`, `realm-2`, ... */
  realmId: string;
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  paragraph?: number;
  /** Wrong words carved in this realm (reading attempts beyond the first). */
  misses: number;
  /** True once the carver closed a loop around any word (right or wrong). */
  started: boolean;
  /** True once every word of the sentence is carved in order. */
  cleared: boolean;
}

export interface Carver {
  col: number;
  row: number;
  /** The held direction, or null when the stick rests. */
  dir: Dir | null;
  /** The claimed cell where the current trail began, or null on claimed land. */
  origin: Cell | null;
  /** Milliseconds until the carver may step again. */
  cooldownMs: number;
}

/** A word beacon in the wild. It stands for one word of the sentence. */
export interface Beacon {
  id: string;
  /** The word's position in the sentence. */
  index: number;
  word: string;
  col: number;
  row: number;
}

export interface Monster {
  id: string;
  kind: MonsterKind;
  col: number;
  row: number;
  /** Diagonal heading: each is -1 or 1. */
  dc: -1 | 1;
  dr: -1 | 1;
  /** Milliseconds until the next step. */
  waitMs: number;
}

export interface RealmCarverState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The campaign: every realm in order. */
  shift: RealmSentence[];
  /** The index of the current realm in `shift` (zero-based). */
  realm: number;
  realms: number;
  /** The board, indexed `grid[row][col]`. */
  grid: CellState[][];
  carver: Carver;
  /** The cells of the trail in drawing order. */
  trail: Cell[];
  beacons: Beacon[];
  monsters: Monster[];
  /** The number of words already carved in this realm (the index of the word to carve next). */
  next: number;
  courage: number;
  maxCourage: number;
  /** Words carved in the campaign, realms cleared, and setbacks suffered. */
  carved: number;
  realmsCleared: number;
  setbacks: number;
  /** The held steer command (a direction of length 0 to 1). */
  steer: { x: number; z: number };
  /** Counter for beacon ids. */
  beaconSeq: number;
}

// ---------------------------------------------------------------- commands

export type RealmCarverCommand =
  /** The carving direction, length 0 to 1 (0 = stop); it holds until the next steer. */
  { type: 'steer'; x: number; z: number };

// ---------------------------------------------------------------- events

export interface BeaconSpawn {
  id: string;
  index: number;
  word: string;
  col: number;
  row: number;
}

export interface MonsterSpawn {
  id: string;
  kind: MonsterKind;
  col: number;
  row: number;
}

export type SetbackCause = 'monster-trail' | 'monster-carver';

export type RealmCarverEvent =
  | {
      type: 'realmStarted';
      realmId: string;
      sentenceId: string;
      words: string[];
      beacons: BeaconSpawn[];
      monsters: MonsterSpawn[];
    }
  /** A loop closed: these cells turned into claimed land. */
  | { type: 'landClaimed'; cells: Cell[] }
  /** The beacon of the next word is carved. */
  | { type: 'wordCarved'; id: string; index: number }
  /** Only other words were carved; they return to the wild. Counts a reading attempt. */
  | { type: 'wordMissed'; id: string; index: number }
  /** A beacon moved to a new cell of the wild. */
  | { type: 'beaconMoved'; id: string }
  /** The beacon of a later word appears in the wild. */
  | { type: 'beaconAppeared'; id: string; index: number }
  /** A monster hit the trail or the carver; the trail fades and the carver goes back to the border. */
  | { type: 'setback'; monsterId: string; cause: SetbackCause }
  /** Courage ran out: the team rests and returns with full courage. Never a game over. */
  | { type: 'rested' }
  /** The wild grew back after much land was claimed. */
  | { type: 'regrown' }
  | { type: 'realmCleared'; realmId: string; sentenceId: string }
  | { type: 'campaignComplete'; realms: number };

export type RealmCarverEventType = RealmCarverEvent['type'];

/** Every event type the core emits; there is no game over. */
export const REALM_CARVER_EVENT_TYPES: readonly RealmCarverEventType[] = [
  'realmStarted',
  'landClaimed',
  'wordCarved',
  'wordMissed',
  'beaconMoved',
  'beaconAppeared',
  'setback',
  'rested',
  'regrown',
  'realmCleared',
  'campaignComplete',
];
