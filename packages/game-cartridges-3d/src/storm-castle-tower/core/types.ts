/**
 * Storm Castle Tower rules core: state, commands, and events (section 6 of
 * docs/game-storm-castle-tower-3d.md). The view reads the state every frame (the climber, the
 * windows, the falling hazards) and animates from the events; every event carries ids, never
 * references. The tower wall is a grid: `col` 0 to 3 from left to right, `row` 0 at the foot and
 * growing upward.
 */

// ---------------------------------------------------------------- state

/** One tower of the climb: a sentence and its reading record. */
export interface TowerSentence {
  /** The sentence id from the story (the evidence `itemId`). */
  id: string;
  /** The tower id: `tower-1`, `tower-2`, ... */
  towerId: string;
  /** The sentence as the student reads it. */
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  /** Zero-based story paragraph the sentence comes from, when known. */
  paragraph?: number;
  /** Wrong windows opened in this tower (reading attempts beyond the first). */
  refusals: number;
  /** True once the climber opened any window of this tower (right or wrong). */
  started: boolean;
  /** True once the climber reached the top of the finished sentence. */
  cleared: boolean;
}

export interface Climber {
  col: number;
  row: number;
  /** Milliseconds until the climber may move again. */
  moveMs: number;
  /** Milliseconds left of the protection after a hit or a rest: hazards pass through. */
  protectMs: number;
  /** Milliseconds left without control (the return after a rest). */
  restMs: number;
}

/** A word window on the wall. Every window of a row looks the same; only the word differs. */
export interface TowerWindow {
  id: string;
  /** The word in the window, without punctuation. */
  word: string;
  col: number;
  row: number;
  /** True when the word is the next word of the sentence (the view must not use it for the look). */
  correct: boolean;
  /** True once a wrong window was opened: it is shut and the climber climbs over it. */
  spent: boolean;
  /** True while the climber stands in the window cell; an opening counts only when this turns true. */
  contact: boolean;
}

/** A window of an earlier word of the tower, kept lit for the view. */
export interface LitWindow {
  word: string;
  col: number;
  row: number;
}

export type HazardType = 'oil' | 'rock';

/** Oil or a rock that falls down one column. `y` is in rows. */
export interface Hazard {
  id: string;
  type: HazardType;
  col: number;
  y: number;
}

export interface StormCastleTowerState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The climb: every tower in order. */
  shift: TowerSentence[];
  /** The index of the current tower in `shift` (zero-based). */
  tower: number;
  /** The number of towers of the climb (`shift.length`). */
  towers: number;
  climber: Climber;
  /** The windows of the current word (empty while the top is open). */
  windows: TowerWindow[];
  /** Windows opened right in the current tower, with their words. */
  lit: LitWindow[];
  hazards: Hazard[];
  /** The index of the next word to open; the words before it are built. */
  next: number;
  /** The row of the windows of the next word; the climber cannot pass it. */
  windowRow: number;
  /** The row of the top of the current tower. */
  summitRow: number;
  /** True when the whole sentence is built; the top opens and the hazards stop. */
  summitOpen: boolean;
  /** The held steer command (x to the right, z toward the camera; up is z < 0). */
  steer: { x: number; z: number };
  /** The lowest row the climber can stand on: the row of the last window opened. */
  floorRow: number;
  /** Where a rest returns the team to. */
  checkpoint: { col: number; row: number };
  courage: number;
  maxCourage: number;
  /** Milliseconds until the next hazard falls. */
  spawnMs: number;
  /** Serial for hazard ids, and the column of the last hazard. */
  hazardSerial: number;
  lastHazardCol: number;
  /** Right windows opened in the climb, towers cleared, rests taken, and hazard hits. */
  collected: number;
  towersCleared: number;
  rests: number;
  hits: number;
}

// ---------------------------------------------------------------- commands

export type StormCastleTowerCommand =
  /** The held climb direction, each axis -1 to 1 (up is z < 0); it holds until the next steer. */
  { type: 'steer'; x: number; z: number };

// ---------------------------------------------------------------- events

export interface WindowSpawn {
  id: string;
  word: string;
  col: number;
  row: number;
}

export interface HazardSpawn {
  id: string;
  type: HazardType;
  col: number;
  y: number;
}

export type StormCastleTowerEvent =
  | { type: 'towerStarted'; towerId: string; sentenceId: string; words: string[]; summitRow: number }
  /** The windows of the next word stand on the wall. */
  | { type: 'windowsPlaced'; row: number; windows: WindowSpawn[] }
  /** The right word: it joins the sentence. */
  | { type: 'windowOpened'; id: string; index: number }
  /** The wrong word. Counts a reading attempt and costs courage. */
  | { type: 'windowShut'; id: string }
  | { type: 'hazardFell'; hazard: HazardSpawn }
  /** A hazard hit the climber: one row down, one courage lost. Not a reading error. */
  | { type: 'climberHit'; hazardId: string }
  | { type: 'courageChanged'; courage: number }
  /** Courage ran out: the team rests and returns to the last open window with full courage. */
  | { type: 'teamRested'; courage: number }
  | { type: 'summitOpened'; towerId: string }
  | { type: 'towerCleared'; towerId: string; sentenceId: string }
  | { type: 'climbComplete'; towers: number };

export type StormCastleTowerEventType = StormCastleTowerEvent['type'];

/** Every event type the core emits; there is no game over. */
export const STORM_CASTLE_TOWER_EVENT_TYPES: readonly StormCastleTowerEventType[] = [
  'towerStarted',
  'windowsPlaced',
  'windowOpened',
  'windowShut',
  'hazardFell',
  'climberHit',
  'courageChanged',
  'teamRested',
  'summitOpened',
  'towerCleared',
  'climbComplete',
];
