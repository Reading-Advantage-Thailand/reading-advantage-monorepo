/**
 * Enchanted Library 3D rules core: state, commands, and events. The hero walks the reading hall
 * (meters on the XZ plane, `x` to the right, `z` toward the camera), collects the book whose
 * English word means the Thai prompt, and keeps away from the spirits. A wrong book or a spirit
 * costs courage; at 0 the team rests and returns to the middle. There is no timer and no game over.
 */
import type { Vec2 } from '@reading-advantage/advantage-play-kit-3d/sim';

/** One round: a vocabulary word of the story to find among the books. */
export interface LibraryRound {
  /** The story vocabulary id (the evidence `itemId`). */
  id: string;
  /** The round id: `round-1`, `round-2`, ... */
  roundId: string;
  /** The English word, shown on the right book. */
  term: string;
  /** The prompt in the student's language (Thai). */
  translation: string;
  /** Wrong books touched in this round (reading attempts beyond the first). */
  wrong: number;
  /** True once the hero touched any book of this round. */
  started: boolean;
  /** True once the right book was collected. */
  cleared: boolean;
}

/** A book on the hall floor: the right one carries the round's term, the others a decoy term. */
export interface Book {
  id: string;
  term: string;
  correct: boolean;
  x: number;
  z: number;
  /** True once a wrong book was touched: it is spent and the hero walks through it. */
  spent: boolean;
}

/** A spirit: it drifts in a straight line and bounces off the walls. */
export interface Spirit {
  id: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Milliseconds in which a shield bounce does not repeat. */
  calmMs: number;
}

export interface Hero {
  x: number;
  z: number;
  /** Heading in degrees (0 faces +Z, 90 faces +X). */
  facing: number;
  /** The held steer direction (length 0 to 1). */
  steerX: number;
  steerZ: number;
  /** The point the hero walks to (a tap), or null. */
  goal: Vec2 | null;
  /** Milliseconds left of the protection after a hit or a rest. */
  hurtMs: number;
  /** Milliseconds left without control (a knock-back or the return after a rest). */
  controlMs: number;
  /** Knock-back direction while `controlMs` runs. */
  pushX: number;
  pushZ: number;
  /** Shield charges left, and milliseconds left of the active shield. */
  charges: number;
  shieldMs: number;
}

export interface LibraryState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  rounds: LibraryRound[];
  /** Index of the current round. */
  round: number;
  roundCount: number;
  hero: Hero;
  books: Book[];
  spirits: Spirit[];
  /** Milliseconds until the next spirit comes. */
  spawnMs: number;
  courage: number;
  maxCourage: number;
  /** Books collected right, rounds cleared, rests taken, and spirit hits in the whole visit. */
  collected: number;
  roundsCleared: number;
  rests: number;
  hits: number;
  /** Serial for spirit ids. */
  spiritSerial: number;
}

// ---------------------------------------------------------------- commands

export type LibraryCommand =
  /** The held walk direction, each axis -1 to 1; it holds until the next steer. */
  | { type: 'steer'; x: number; z: number }
  /** Walk to a point or to a book (a tap). */
  | { type: 'goto'; x?: number; z?: number; bookId?: string }
  /** Raise the shield (uses one charge). */
  | { type: 'shield' };

// ---------------------------------------------------------------- events

export interface BookSpawn {
  id: string;
  term: string;
  x: number;
  z: number;
}

export interface SpiritSpawn {
  id: string;
  x: number;
  z: number;
}

export type LibraryEvent =
  | { type: 'roundStarted'; roundId: string; itemId: string; term: string; translation: string; books: BookSpawn[] }
  /** The right book: the round is cleared. */
  | { type: 'bookCollected'; id: string; itemId: string }
  /** A wrong book: a reading attempt, and it costs courage. */
  | { type: 'bookWrong'; id: string }
  | { type: 'shieldUp'; charges: number }
  | { type: 'shieldDown' }
  | { type: 'shieldBlocked'; spiritId: string }
  | { type: 'spiritSpawned'; spirit: SpiritSpawn }
  | { type: 'heroHit'; spiritId: string }
  | { type: 'courageChanged'; courage: number }
  /** Courage ran out: the team rests and returns to the middle with full courage. */
  | { type: 'teamRested'; courage: number }
  | { type: 'roundCleared'; roundId: string; itemId: string }
  | { type: 'visitComplete'; rounds: number };

export type LibraryEventType = LibraryEvent['type'];

/** Every event type the core emits; there is no game over. */
export const LIBRARY_EVENT_TYPES: readonly LibraryEventType[] = [
  'roundStarted',
  'bookCollected',
  'bookWrong',
  'shieldUp',
  'shieldDown',
  'shieldBlocked',
  'spiritSpawned',
  'heroHit',
  'courageChanged',
  'teamRested',
  'roundCleared',
  'visitComplete',
];
