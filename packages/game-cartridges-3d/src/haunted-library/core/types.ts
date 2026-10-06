/**
 * Haunted Library 3D rules core: state, commands, and events. The library has four floors; the
 * hero walks along a floor (`x` in meters, 0 in the middle), bounces up one floor on a pad at
 * either end, and drops down one floor on command. The view maps `floor` to a height (3D) or to
 * a lane (2D); the core never knows which.
 */

/** Number of floors, bottom (0) to top (3). */
export const FLOOR_COUNT = 4;

/** A sentence of the library: one room per sentence. */
export interface LibraryRoom {
  /** The sentence id from the story (the evidence `itemId`). */
  id: string;
  /** The room id: `room-1`, `room-2`, ... */
  roomId: string;
  text: string;
  words: string[];
  translation?: string;
  /** Zero-based story paragraph, when known. */
  paragraph?: number;
  /** Doors opened out of order in this room (reading attempts beyond the first). */
  refusals: number;
  /** True once the hero tried any door of this room (right or wrong). */
  started: boolean;
  /** True once every door of the room opened in order. */
  cleared: boolean;
}

/** One door: one word of the sentence, on one floor. */
export interface Door {
  id: string;
  word: string;
  /** The word's position in the sentence. */
  index: number;
  x: number;
  floor: number;
  open: boolean;
}

export type HazardKind = 'ghost' | 'bat';

/** A ghost (a patrol that a right door stuns) or a bat (the wrong door lets one out). */
export interface Hazard {
  id: string;
  kind: HazardKind;
  x: number;
  floor: number;
  /** Meters per second along the floor. */
  vx: number;
  /** Milliseconds left of the stun (ghosts only; 0 = moving). */
  stunMs: number;
}

export interface Hero {
  x: number;
  /** The floor the hero stands on (while travelling: the floor it left). */
  floor: number;
  /** The floor the hero is travelling to (equals `floor` when it stands). */
  toFloor: number;
  /** Milliseconds left of a bounce up or a drop down (0 = standing). */
  travelMs: number;
  /** 1 faces +X, -1 faces -X. */
  facing: 1 | -1;
  /** Milliseconds left of the protection after a hit (no second hit meanwhile). */
  hurtMs: number;
  /** Milliseconds left without control (a knock-back or the return after a rest). */
  controlMs: number;
  /** Direction of the knock-back while `controlMs` runs (1 or -1, 0 = none). */
  push: number;
  /** Milliseconds left in which a pad does not bounce the hero (after a landing). */
  padMs: number;
}

export interface LibraryState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The rooms of the visit, in order. */
  shift: LibraryRoom[];
  /** Index of the current room in `shift`. */
  room: number;
  rooms: number;
  hero: Hero;
  doors: Door[];
  hazards: Hazard[];
  /** Index of the next word to open. */
  next: number;
  /** Courage left; at 0 the team rests and returns to the entrance with full courage. */
  courage: number;
  maxCourage: number;
  /** The held walk direction. */
  move: -1 | 0 | 1;
  /** Doors opened in order, rooms cleared, and rests taken in the whole visit. */
  opened: number;
  roomsCleared: number;
  rests: number;
  /** Serial for bat ids. */
  batSerial: number;
}

// ---------------------------------------------------------------- commands

export type LibraryCommand =
  /** The walk direction, -1 left, 1 right, 0 stop; it holds until the next move. */
  | { type: 'move'; dir: number }
  /** Drop down one floor (from any spot of a floor above the ground floor). */
  | { type: 'drop' }
  /** Open the nearest door on this floor. */
  | { type: 'open' };

// ---------------------------------------------------------------- events

export interface DoorSpawn {
  id: string;
  word: string;
  index: number;
  x: number;
  floor: number;
}

export interface HazardSpawn {
  id: string;
  kind: HazardKind;
  x: number;
  floor: number;
}

export type HitCause = 'ghost' | 'bat';

export type LibraryEvent =
  | { type: 'roomStarted'; roomId: string; sentenceId: string; words: string[]; doors: DoorSpawn[]; hazards: HazardSpawn[] }
  /** The right door opened; ghosts close by are stunned. */
  | { type: 'doorOpened'; id: string; index: number; stunned: string[] }
  /** A door out of order; a bat comes out and the hero loses courage. Counts a reading attempt. */
  | { type: 'doorWrong'; id: string; bat: HazardSpawn | null; removed: string | null }
  | { type: 'bounced'; toFloor: number }
  | { type: 'dropped'; toFloor: number }
  /** The hero landed on a floor. */
  | { type: 'landed'; floor: number }
  /** A ghost or bat touched the hero. Not a reading error. */
  | { type: 'heroHit'; by: HitCause; hazardId: string }
  | { type: 'courageChanged'; courage: number }
  /** Courage ran out: the team rests and returns to the entrance with full courage. */
  | { type: 'teamRested'; courage: number }
  | { type: 'roomCleared'; roomId: string; sentenceId: string }
  | { type: 'visitComplete'; rooms: number };

export type LibraryEventType = LibraryEvent['type'];

/** Every event type the core emits; there is no game over. */
export const LIBRARY_EVENT_TYPES: readonly LibraryEventType[] = [
  'roomStarted',
  'doorOpened',
  'doorWrong',
  'bounced',
  'dropped',
  'landed',
  'heroHit',
  'courageChanged',
  'teamRested',
  'roomCleared',
  'visitComplete',
];
