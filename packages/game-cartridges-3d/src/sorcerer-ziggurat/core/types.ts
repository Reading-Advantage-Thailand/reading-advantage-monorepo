/**
 * Sorcerer's Ziggurat 3D rules core: state, commands, and events. The student climbs a stepped
 * ziggurat one tier per word of a sentence. On each tier up to three rune cubes (left, forward,
 * right) carry a word; the cube with the next word of the sentence takes the hero up one tier,
 * any other cube crumbles and costs one courage. The core knows lanes and tiers, never meters:
 * the 3D view and the 2D view each map them to their own geometry.
 */

/** The three adjacent cubes the hero can step onto. */
export type Lane = 'left' | 'forward' | 'right';

export const LANES: readonly Lane[] = ['left', 'forward', 'right'];

/** A sentence of the climb: one ritual per sentence. */
export interface Ritual {
  /** The sentence id from the story (the evidence `itemId`). */
  id: string;
  /** The ritual id: `ritual-1`, `ritual-2`, ... */
  ritualId: string;
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  /** Zero-based story paragraph, when known. */
  paragraph?: number;
  /** Cubes that crumbled in this ritual (reading attempts beyond the first). */
  refusals: number;
  /** True once the hero chose any cube of this ritual. */
  started: boolean;
  /** True once the hero climbed every tier of the sentence. */
  cleared: boolean;
}

/** One rune cube of the tier on offer. */
export interface Cube {
  id: string;
  /** The word on the cube, without punctuation at its edges. */
  word: string;
  lane: Lane;
  /** True for the cube that holds the next word of the sentence. */
  correct: boolean;
  /** True once the cube crumbled (it took a wrong step). */
  spent: boolean;
}

export interface Hero {
  /** The lane of the cube the hero stands on (`forward` at the foot of the ziggurat). */
  lane: Lane;
  /** The tier the hero stands on; 0 is the foot. */
  tier: number;
}

export interface ZigguratState {
  phase: 'climbing' | 'complete';
  helper: boolean;
  /** The rituals of the visit, in order. */
  climb: Ritual[];
  /** Index of the current ritual in `climb`. */
  ritual: number;
  rituals: number;
  /** Index of the next word to climb to (equals `hero.tier`). */
  tier: number;
  hero: Hero;
  /** The cubes of the tier on offer; empty when the climb is complete. */
  cubes: Cube[];
  /** Courage left; at 0 the team rests and returns with full courage. */
  courage: number;
  maxCourage: number;
  /** Steps up, rituals cleared, wrong cubes, and rests in the whole visit. */
  steps: number;
  ritualsCleared: number;
  crumbled: number;
  rests: number;
}

// ---------------------------------------------------------------- commands

/** Steps onto one cube: by id (a tap on its tag) or by lane (the arrow keys). */
export type ZigguratCommand = { type: 'step'; cubeId?: string; lane?: Lane };

// ---------------------------------------------------------------- events

export interface CubeSpawn {
  id: string;
  word: string;
  lane: Lane;
  /** True for the cube with the next word (the view marks it in Helper mode). */
  correct: boolean;
}

export type ZigguratEvent =
  | { type: 'ritualStarted'; ritualId: string; sentenceId: string; words: string[]; translation?: string }
  /** A new tier of cubes on offer; `tier` is the zero-based index of the word to find. */
  | { type: 'tierOffered'; tier: number; cubes: CubeSpawn[] }
  /** The right cube: the hero climbs to it. `tier` is the number of words now climbed. */
  | { type: 'stepped'; cubeId: string; lane: Lane; tier: number }
  /** A wrong cube crumbles. Counts a reading attempt. */
  | { type: 'cubeCrumbled'; id: string; lane: Lane }
  | { type: 'courageChanged'; courage: number }
  /** Courage ran out: the team rests and returns with full courage; the crumbled cubes of the tier return. */
  | { type: 'teamRested'; courage: number; restored: string[] }
  | { type: 'ritualCleared'; ritualId: string; sentenceId: string }
  | { type: 'climbComplete'; rituals: number };

export type ZigguratEventType = ZigguratEvent['type'];

/** Every event type the core emits; there is no game over. */
export const ZIGGURAT_EVENT_TYPES: readonly ZigguratEventType[] = [
  'ritualStarted',
  'tierOffered',
  'stepped',
  'cubeCrumbled',
  'courageChanged',
  'teamRested',
  'ritualCleared',
  'climbComplete',
];
