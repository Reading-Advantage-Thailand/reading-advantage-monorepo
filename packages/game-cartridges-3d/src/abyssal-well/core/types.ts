/**
 * Abyssal Well rules core: state, commands, and events (design: docs/game-abyssal-well-3d.md).
 * The game is turn based: the view reads the state after every command and plays the events in
 * order; every event carries ids and plain values, never object references.
 */

/** Radial lanes around the well, and the depth steps of a climb (0 = the bottom, `RIM_DEPTH` = the rim). */
export const LANES = 8;
export const RIM_DEPTH = 4;

/** The creatures that climb the well, by Forge model name; they take turns by their spawn number. */
export const CREATURES = ['goblin-warrior', 'skeleton', 'slime'] as const;

export type Creature = (typeof CREATURES)[number];

/** A word enemy holds one word of the sentence; an echo enemy holds a word that is not in it. */
export type EnemyKind = 'word' | 'echo';

/** One descent of the run: a sentence from the story and its reading record. */
export interface Descent {
  /** The sentence id from the story (the evidence `itemId`). */
  id: string;
  /** The descent id: `descent-1`, `descent-2`, ... */
  descentId: string;
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  /** Zero-based story paragraph the sentence comes from, when known. */
  paragraph?: number;
  /** Arrows that bounced off a wrong enemy in this descent (reading attempts beyond the first). */
  refusals: number;
  /** True once any arrow flew in this descent. */
  started: boolean;
  /** True once the whole sentence is built. */
  cleared: boolean;
}

export interface Enemy {
  id: string;
  lane: number;
  /** Steps up from the bottom of the well, 0 to `RIM_DEPTH`. */
  depth: number;
  word: string;
  kind: EnemyKind;
  /** The word's position in the sentence; -1 for an echo enemy. */
  index: number;
  creature: Creature;
}

export interface AbyssalWellState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** After the `start` command. */
  started: boolean;
  descents: Descent[];
  /** The index of the current descent in `descents` (zero-based). */
  descent: number;
  descentCount: number;
  /** The lane of the archer at the rim. */
  lane: number;
  enemies: Enemy[];
  /** The index of the next word to hit. */
  next: number;
  /** Words hit in the run, and descents cleared. */
  struck: number;
  descentsCleared: number;
  courage: number;
  maxCourage: number;
  /** Arrows shot. */
  shots: number;
  /** Enemies made so far (the id counter). */
  spawned: number;
}

// ---------------------------------------------------------------- commands

export type AbyssalWellCommand =
  /** Once, when the stage is ready: plays `descentStarted` for the view. */
  | { type: 'start' }
  /** Turns the archer one lane around the rim (-1 left, 1 right). */
  | { type: 'rotate'; dir: -1 | 1 }
  /** Shoots down a lane (the archer turns there first); the lane needs an enemy. Without `lane`: the archer's lane. */
  | { type: 'fire'; lane?: number };

// ---------------------------------------------------------------- events

/** An enemy as the view builds it. */
export interface EnemyShown {
  id: string;
  lane: number;
  depth: number;
  word: string;
  kind: EnemyKind;
  index: number;
  creature: Creature;
}

export type AbyssalWellEvent =
  | { type: 'descentStarted'; descentId: string; sentenceId: string; words: string[]; translation?: string; enemies: EnemyShown[] }
  | { type: 'moved'; lane: number }
  /** An arrow flew down a lane at an enemy; `correct` is true when it holds the next word. */
  | { type: 'fired'; lane: number; enemyId: string; correct: boolean }
  /** The enemy of the next word fell into the sentence. */
  | { type: 'struck'; enemyId: string; index: number }
  /** The arrow bounced off a wrong enemy; the enemy is thrown back to the bottom and counts a reading attempt. */
  | { type: 'repelled'; enemyId: string }
  | { type: 'courageLost'; courage: number }
  | { type: 'rest'; courage: number }
  /** After a shot every enemy that is left climbs one step (at most to the rim). */
  | { type: 'climbed'; moves: { id: string; depth: number }[] }
  | { type: 'spawned'; enemy: EnemyShown }
  | { type: 'descentCleared'; descentId: string; sentenceId: string }
  | { type: 'wellComplete'; descents: number }
  | { type: 'rejected'; command: string };

export type AbyssalWellEventType = AbyssalWellEvent['type'];

/** Every event type the core emits; there is no game over. */
export const ABYSSAL_WELL_EVENT_TYPES: readonly AbyssalWellEventType[] = [
  'descentStarted',
  'moved',
  'fired',
  'struck',
  'repelled',
  'courageLost',
  'rest',
  'climbed',
  'spawned',
  'descentCleared',
  'wellComplete',
  'rejected',
];
