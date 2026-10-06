/**
 * Devourer Slime 3D rules core: state, commands, and events (section 6 of
 * docs/game-devourer-slime-3d.md). The view reads the state every frame (positions, the slime's
 * size, the bubbles) and animates from the events; every event carries ids, never references.
 * Positions are meters on the clearing floor: `x` to the right, `z` toward the camera.
 */

// ---------------------------------------------------------------- content kinds

/** Guard models of the clearing, in the order of the seeded list. */
export const GUARD_KINDS = ['guard', 'bandit'] as const;

export type GuardKind = (typeof GUARD_KINDS)[number];

// ---------------------------------------------------------------- state

/** One sentence of the shift and its reading record. */
export interface ShiftSentence {
  /** The sentence id from the story (the evidence `itemId`). */
  id: string;
  /** The sentence as the student reads it. */
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  /** Zero-based story paragraph the sentence comes from, when known. */
  paragraph?: number;
  /** Bubbles eaten out of order in this sentence (reading attempts beyond the first). */
  wrong: number;
  /** True once the slime ate or spat any bubble of this sentence. */
  started: boolean;
  /** True once every word of the sentence is eaten. */
  complete: boolean;
}

export interface Slime {
  x: number;
  z: number;
  /** 1 = the start size; the radius is `SLIME_RADIUS * size`. */
  size: number;
  /** Heading in degrees: 0 faces +Z (the camera), 90 faces +X. */
  facing: number;
  /** Milliseconds left without control after a guard bump (0 = in control). */
  bumpedMs: number;
  /** Milliseconds left of the power-up (0 = normal). Only a powered slime swallows guards. */
  poweredMs: number;
  /** The push direction of the bump (a unit vector) while `bumpedMs` runs. */
  pushX: number;
  pushZ: number;
}

export interface Bubble {
  id: string;
  word: string;
  /** The word's position in the sentence. */
  index: number;
  x: number;
  z: number;
  eaten: boolean;
  /** Milliseconds left after a spit during which the bubble cannot be eaten again (0 = none). */
  spatMs: number;
}

export interface Guard {
  id: string;
  kind: GuardKind;
  x: number;
  z: number;
  /** Velocity in meters per second. */
  vx: number;
  vz: number;
  /** Body size on the slime's scale (the radius is `bodyRadius * size`). */
  size: number;
}

export interface DevourerSlimeState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The shift: every sentence in order. */
  shift: ShiftSentence[];
  /** The index of the current sentence in `shift` (zero-based). */
  sentence: number;
  /** The number of sentences of the shift (`shift.length`). */
  sentences: number;
  slime: Slime;
  bubbles: Bubble[];
  /** The index of the next word to eat. */
  next: number;
  guards: Guard[];
  coins: number;
  /** The held steer command (a direction of length 0 to 1). */
  steer: { x: number; z: number };
  /** Words eaten in the shift (right bubbles), and guards eaten. */
  eaten: number;
  guardsEaten: number;
}

// ---------------------------------------------------------------- commands

export type DevourerSlimeCommand =
  /** The move direction, length 0 to 1 (0 = stop); it holds until the next steer. */
  { type: 'steer'; x: number; z: number };

// ---------------------------------------------------------------- events

export interface BubbleSpawn {
  id: string;
  word: string;
  index: number;
  x: number;
  z: number;
}

export type DevourerSlimeEvent =
  | { type: 'sentenceStarted'; sentenceId: string; words: string[]; bubbles: BubbleSpawn[] }
  | { type: 'wordEaten'; id: string; index: number; size: number }
  /** Wrong word: the bubble bounces 1.5 m away, the slime shrinks a little. Counts an attempt. */
  | { type: 'wordSpat'; id: string; size: number }
  /** A bigger guard pushed the slime back (0.8 s without control). Not a reading error. */
  | { type: 'slimeBumped'; guardId: string; size: number }
  /** The slime grew past a guard: it is powered for `durationMs` and can swallow guards. */
  | { type: 'powerStarted'; durationMs: number; size: number }
  /** The countdown ran out: the slime is back to its start size. */
  | { type: 'powerEnded'; size: number }
  | { type: 'guardEaten'; guardId: string; size: number; coins: number }
  /** An eaten guard is back at once, at a spawn point far from the slime. */
  | { type: 'guardReturned'; guardId: string; kind: GuardKind; x: number; z: number }
  | { type: 'sentenceComplete'; sentenceId: string }
  | { type: 'shiftComplete'; sentences: number; size: number };

export type DevourerSlimeEventType = DevourerSlimeEvent['type'];

/** Every event type the core emits; there is no game over. */
export const DEVOURER_SLIME_EVENT_TYPES: readonly DevourerSlimeEventType[] = [
  'sentenceStarted',
  'wordEaten',
  'wordSpat',
  'slimeBumped',
  'powerStarted',
  'powerEnded',
  'guardEaten',
  'guardReturned',
  'sentenceComplete',
  'shiftComplete',
];
