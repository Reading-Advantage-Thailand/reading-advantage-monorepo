/**
 * Griffin Sky-Joust rules core: state, commands, and events (docs/game-griffin-sky-joust-3d.md).
 * The arena keeps the legacy pixel space (960 by 540, y down); the views scale it to their world.
 * The view reads the state every frame (griffin, riders) and animates from the events; every
 * event carries ids and numbers, never references.
 */

// ---------------------------------------------------------------- content

/** One sentence of the joust and what the student did with it. */
export interface JoustSentence {
  /** The sentence id, equal to the story sentence id (the evidence `itemId`). */
  id: string;
  text: string;
  /** The words (tokens) in the correct order; punctuation stays attached to its word. */
  words: string[];
  /** The prompt shown above the arena (the student's language), when the story has one. */
  translation?: string;
  /** Zero-based paragraph of the story (the reading look-back). */
  paragraph?: number;
  /** Strikes from above on a rider with the wrong word. */
  misses: number;
  /** True once the student struck a rider of this sentence. */
  started: boolean;
  /** True once every word of the sentence was struck in order. */
  cleared: boolean;
}

// ---------------------------------------------------------------- state

/** The griffin: position and velocity in arena pixels, pixels per second. */
export interface Griffin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Milliseconds left in which a bump does nothing. */
  safeMs: number;
  radius: number;
}

/** A rider with one word of the current sentence; it flies sideways at a fixed height. */
export interface Rider {
  id: string;
  text: string;
  x: number;
  y: number;
  /** Pixels per second; the sign is the direction. */
  vx: number;
  radius: number;
}

export type JoustPhase = 'playing' | 'complete';

export interface JoustState {
  phase: JoustPhase;
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  griffin: Griffin;
  /** The riders of the current sentence that are still in the air. */
  riders: Rider[];
  /** The sentences of the joust, in the seeded order. */
  sentences: JoustSentence[];
  /** Index of the current sentence. */
  sentence: number;
  /** Words of the current sentence struck so far. */
  word: number;
  /** Courage: a bump costs one; at 0 the griffin rests and gets it all back. Never ends the game. */
  courage: number;
  /** Time left of the rest after the courage ran out, in milliseconds; 0 when not resting. */
  restMs: number;
  /** Time left of the pause between two sentences, in milliseconds; 0 during a sentence. */
  pauseMs: number;
  score: number;
  /** Riders spawned so far (the id counter). */
  spawned: number;
}

// ---------------------------------------------------------------- commands

export type JoustCommand =
  /** A wing beat: lifts the griffin; `dir` also pushes it left (-1) or right (+1). */
  | { type: 'flap'; dir: -1 | 0 | 1 }
  /** A sideways push without lift. */
  | { type: 'drift'; dir: -1 | 1 };

// ---------------------------------------------------------------- events

export type JoustEvent =
  | { type: 'sentenceStarted'; sentence: number; id: string }
  | { type: 'flapped'; dir: -1 | 0 | 1 }
  /** The griffin struck the rider with the next word from above. */
  | { type: 'wordStruck'; sentence: number; wordIndex: number; text: string; riderId: string; x: number; y: number }
  /** A bump cost one courage. `strike` is true for a strike from above on a wrong word. */
  | { type: 'bumped'; riderId: string; strike: boolean; courage: number }
  /** The griffin rested and returned with all its courage. */
  | { type: 'rested'; courage: number }
  /** The last word of a sentence was struck: the sentence is whole. */
  | { type: 'sentenceDone'; sentence: number; id: string }
  | { type: 'joustComplete'; score: number };

export type JoustEventType = JoustEvent['type'];

/** Every event type the core emits; there is no game over. */
export const JOUST_EVENT_TYPES: readonly JoustEventType[] = [
  'sentenceStarted',
  'flapped',
  'wordStruck',
  'bumped',
  'rested',
  'sentenceDone',
  'joustComplete',
];
