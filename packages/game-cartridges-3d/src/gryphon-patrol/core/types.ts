/**
 * Gryphon Patrol rules core: state, commands, and events (docs/game-gryphon-patrol-3d.md).
 * The view reads the state every frame (gryphon, enemies, shot, orb) and animates from the events;
 * every event carries ids and numbers, never references.
 */

// ---------------------------------------------------------------- content

/** One sentence of the patrol and what the student did with it. */
export interface PatrolSentence {
  /** The sentence id, equal to the story sentence id (the evidence `itemId`). */
  id: string;
  text: string;
  /** The words (tokens) in the correct order; punctuation stays attached to its word. */
  words: string[];
  /** The prompt shown above the sky (the student's language), when the story has one. */
  translation?: string;
  /** Zero-based paragraph of the story (the reading look-back). */
  paragraph?: number;
  /** Shots that hit a wrong enemy while this sentence was on. */
  misses: number;
  /** True once the student shot at an enemy for this sentence. */
  started: boolean;
  /** True once every word of the sentence was collected. */
  cleared: boolean;
}

/** A word enemy of a round: a bat that carries a word on a banner. */
export interface Enemy {
  /** `e1`, `e2`, ... within the round (left to right by home slot). */
  id: string;
  text: string;
  /** True for the enemy that carries the next word of the sentence. */
  right: boolean;
  /** False once the enemy was hit or sent away. */
  alive: boolean;
  /** Position in the sky, in meters (x across, y up). Updated every step from the motion below. */
  x: number;
  y: number;
  /** The motion: a slow loop around the home point `(cx, cy)` inside the enemy's own slot. */
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  w1: number;
  w2: number;
  p1: number;
  p2: number;
}

/** The enemy a round shows: id and word (for events). */
export interface EnemyInfo {
  id: string;
  text: string;
}

/** One round: the enemies for the next word of the sentence. */
export interface Round {
  id: string;
  /** Index of the sentence in the patrol. */
  sentence: number;
  /** Index of the word in the sentence. */
  wordIndex: number;
  /** The next word (the answer). */
  answer: string;
  enemies: Enemy[];
  /** Game time when the round opened (the enemies move from here). */
  startMs: number;
  /** `aim` until a shot is fired, `shot` while it flies, `orb` while the gryphon fetches the word, `done` after. */
  stage: 'aim' | 'shot' | 'orb' | 'done';
  /** True when this round repeats a word after a wrong shot. */
  retry: boolean;
}

export interface Gryphon {
  x: number;
  y: number;
  /** +1 faces right (+x), -1 faces left. */
  facing: 1 | -1;
  /** Where the gryphon flies to; equal to its position at rest. */
  toX: number;
  toY: number;
}

/** The shot in flight: it homes in on one enemy. */
export interface Shot {
  enemy: string;
  x: number;
  y: number;
  ageMs: number;
}

/** The word orb a right hit drops; the gryphon flies to it and takes it. */
export interface WordOrb {
  text: string;
  x: number;
  y: number;
  /** True when the word follows a wrong shot (the lower score). */
  retry: boolean;
}

// ---------------------------------------------------------------- state

export type PatrolPhase = 'patrol' | 'finale' | 'complete';

export interface PatrolState {
  phase: PatrolPhase;
  helper: boolean;
  /** Enemies per round: 3 in Helper mode, 4 otherwise. */
  enemyCount: number;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** Time left of the rest after a wrong shot, in milliseconds; 0 when not resting. */
  restMs: number;
  /** Time left before the next round opens after a word, in milliseconds. */
  gapMs: number;
  /** Time left of the closing flight, in milliseconds. */
  finaleMs: number;
  /** Courage: a wrong shot costs one; at 0 the gryphon rests and gets it all back. Never ends the patrol. */
  courage: number;
  score: number;
  gryphon: Gryphon;
  /** The sentences of the patrol, in the seeded order. */
  sentences: PatrolSentence[];
  /** Index of the current sentence. */
  sentence: number;
  /** Words of the current sentence collected so far. */
  word: number;
  /** The current round, or null before the first tick and between rounds. */
  round: Round | null;
  /** Rounds started so far (retries included). */
  rounds: number;
  shot: Shot | null;
  orb: WordOrb | null;
  /** Words collected so far in all sentences. */
  collected: number;
}

// ---------------------------------------------------------------- commands

export type PatrolCommand =
  /** The student shoots the enemy with this id (it must be alive in the open round). */
  | { type: 'shoot'; enemy: string }
  /** The student sends the gryphon to a point of the sky (it flies there). */
  | { type: 'moveTo'; x: number; y: number };

// ---------------------------------------------------------------- events

export type PatrolEvent =
  | { type: 'roundStarted'; roundId: string; sentence: number; wordIndex: number; enemies: EnemyInfo[]; retry: boolean }
  | { type: 'shotFired'; roundId: string; enemy: string }
  /** The shot reached an enemy. A right hit drops the word orb; a wrong one costs courage. */
  | { type: 'enemyHit'; roundId: string; enemy: string; correct: boolean; rightEnemy: string; x: number; y: number }
  | { type: 'orbDropped'; text: string; x: number; y: number }
  | { type: 'wordCollected'; sentence: number; wordIndex: number; text: string }
  /** A wrong shot cost one courage. */
  | { type: 'courageLost'; courage: number }
  /** The gryphon rested and returned with all its courage. */
  | { type: 'rested'; courage: number }
  /** The last word of a sentence was collected. */
  | { type: 'sentenceCast'; sentence: number; id: string }
  | { type: 'patrolComplete'; score: number };

export type PatrolEventType = PatrolEvent['type'];

/** Every event type the core emits; there is no game over. */
export const PATROL_EVENT_TYPES: readonly PatrolEventType[] = [
  'roundStarted',
  'shotFired',
  'enemyHit',
  'orbDropped',
  'wordCollected',
  'courageLost',
  'rested',
  'sentenceCast',
  'patrolComplete',
];
