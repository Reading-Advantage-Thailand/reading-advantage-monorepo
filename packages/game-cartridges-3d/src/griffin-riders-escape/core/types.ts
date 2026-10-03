/**
 * Griffin Riders Escape rules core: state, commands, and events (docs/game-griffin-riders-escape-3d.md).
 * The view reads the state every frame (distance, the griffin, the waves ahead) and animates from
 * the events; every event carries ids and numbers, never references.
 */

// ---------------------------------------------------------------- content

/** One sentence of the escape and what the student did with it. */
export interface EscapeSentence {
  /** The sentence id, equal to the story sentence id (the evidence `itemId`). */
  id: string;
  text: string;
  /** The words (tokens) in the correct order; punctuation stays attached to its word. */
  words: string[];
  /** The prompt shown above the flight (the student's language), when the story has one. */
  translation?: string;
  /** Zero-based paragraph of the story (the reading look-back). */
  paragraph?: number;
  /** Gates flown through that did not carry the next word of this sentence. */
  misses: number;
  /** True once the griffin flew through a gate row for this sentence. */
  started: boolean;
  /** True once every word of the sentence was collected. */
  cleared: boolean;
}

/** A word gate: a ring in one lane that carries a word. */
export interface Gate {
  lane: number;
  text: string;
}

/**
 * A wave: a row of word gates (`gates`) or a storm (a bat swarm that fills `stormLanes`). A storm
 * never fills every lane, so a free lane always exists.
 */
export interface Wave {
  id: string;
  kind: 'gates' | 'storm';
  /** Distance along the flight path where the wave sits, in meters. */
  z: number;
  /** The sentence and word index a gate wave asks for (the same for a storm: the word that follows). */
  sentence: number;
  wordIndex: number;
  gates: Gate[];
  /** The lane of the gate with the next word (-1 for a storm). */
  rightLane: number;
  stormLanes: number[];
  /** True when this gate wave repeats a word after a wrong gate. */
  retry: boolean;
}

/** What an event says about a gate or a storm lane (id, word). */
export interface GateInfo {
  lane: number;
  text: string;
}

export interface Griffin {
  /** Position across the flight, in meters (0 is the middle lane). */
  x: number;
  /** The lane the griffin flies to (0 = left); equal to the nearest lane at rest. */
  lane: number;
}

// ---------------------------------------------------------------- state

export type EscapePhase = 'flight' | 'finale' | 'complete';

export interface EscapeState {
  phase: EscapePhase;
  helper: boolean;
  /** Lanes across the sky (3). */
  laneCount: number;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** Distance flown along the path, in meters. */
  distance: number;
  /** Speed along the path, in meters per second; 0 while resting. */
  speed: number;
  /** Time left of the rest after a setback, in milliseconds; 0 when not resting. */
  restMs: number;
  /** Time left of the closing flight, in milliseconds. */
  finaleMs: number;
  /** Courage: a wrong gate or a storm costs one; at 0 the riders rest and get it all back. Never ends the flight. */
  courage: number;
  score: number;
  griffin: Griffin;
  /** The sentences of the escape, in the seeded order. */
  sentences: EscapeSentence[];
  /** Index of the current sentence. */
  sentence: number;
  /** Words of the current sentence collected so far. */
  word: number;
  /** The waves ahead of the griffin, nearest first. */
  waves: Wave[];
  /** Waves made so far (retries included). */
  made: number;
  /** True when the next gate wave repeats the word after a wrong gate. */
  retryNext: boolean;
  /** Words collected so far in all sentences. */
  collected: number;
  /** Storms that hit the griffin (not part of the evidence). */
  bumps: number;
}

// ---------------------------------------------------------------- commands

export type EscapeCommand =
  /** The student sends the griffin to a lane (0 = left). */
  | { type: 'lane'; lane: number }
  /** The student moves the griffin one lane left (-1) or right (+1). */
  | { type: 'steer'; dir: -1 | 1 };

// ---------------------------------------------------------------- events

export type EscapeEvent =
  | { type: 'waveMade'; waveId: string; kind: 'gates' | 'storm'; z: number; sentence: number; wordIndex: number; gates: GateInfo[]; stormLanes: number[]; retry: boolean }
  | { type: 'laneChanged'; lane: number }
  /** The griffin flew through a lane of a gate row. A right gate collects the word; a wrong one costs courage. */
  | { type: 'gatePassed'; waveId: string; lane: number; correct: boolean; rightLane: number; text: string }
  | { type: 'wordCollected'; sentence: number; wordIndex: number; text: string }
  /** The griffin flew into a storm. */
  | { type: 'stormHit'; waveId: string; lane: number }
  /** The griffin passed a storm in a free lane. */
  | { type: 'stormDodged'; waveId: string }
  /** A wrong gate or a storm cost one courage. */
  | { type: 'courageLost'; courage: number; cause: 'gate' | 'storm' }
  /** The riders rested and returned with all their courage. */
  | { type: 'rested'; courage: number }
  /** The last word of a sentence was collected. */
  | { type: 'sentenceCast'; sentence: number; id: string }
  | { type: 'escapeComplete'; score: number };

export type EscapeEventType = EscapeEvent['type'];

/** Every event type the core emits; there is no game over. */
export const ESCAPE_EVENT_TYPES: readonly EscapeEventType[] = [
  'waveMade',
  'laneChanged',
  'gatePassed',
  'wordCollected',
  'stormHit',
  'stormDodged',
  'courageLost',
  'rested',
  'sentenceCast',
  'escapeComplete',
];
