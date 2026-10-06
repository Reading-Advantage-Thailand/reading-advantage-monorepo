/**
 * Astral Mage 3D rules core: state, commands, and events (section 6 of docs/game-astral-mage-3d.md).
 * The view reads the state every frame (the drifting crystals, the bolt) and animates from the
 * events; every event carries ids, never references. Positions are meters on the casting floor:
 * `x` to the right, `z` toward the camera. The mage stands at the near edge and never moves.
 */

// ---------------------------------------------------------------- state

/** A word crystal holds one word of the sentence; an echo crystal holds a word that is not in it. */
export type CrystalKind = 'word' | 'echo';

/** One ritual of the casting: a sentence and its reading record. */
export interface RitualSentence {
  /** The sentence id from the story (the evidence `itemId`). */
  id: string;
  /** The ritual id: `ritual-1`, `ritual-2`, ... */
  ritualId: string;
  /** The sentence as the student reads it. */
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  /** Zero-based story paragraph the sentence comes from, when known. */
  paragraph?: number;
  /** Bolts that fizzled in this ritual (reading attempts beyond the first). */
  refusals: number;
  /** True once the mage cast any bolt in this ritual. */
  started: boolean;
  /** True once the whole sentence is built. */
  cleared: boolean;
}

export interface Crystal {
  id: string;
  word: string;
  kind: CrystalKind;
  /** The word's position in the sentence; -1 for an echo crystal. */
  index: number;
  /** The anchor the crystal drifts around. */
  ax: number;
  az: number;
  /** The drift now (anchor + a slow loop, a pure function of the game time). */
  x: number;
  z: number;
  /** The start angle of the drift loop, in radians. */
  phase: number;
  /** True once the crystal shattered (it was the next word). */
  struck: boolean;
  /** Milliseconds left of the dim after a bolt that fizzled (0 = bright and castable). */
  dimMs: number;
}

export interface Mage {
  x: number;
  z: number;
  /** Heading in degrees: 0 faces +Z (the camera), 180 faces away from it. */
  facing: number;
}

/** A bolt in flight: it homes on its crystal and resolves on arrival. */
export interface Bolt {
  id: string;
  targetId: string;
  x: number;
  z: number;
}

export interface AstralMageState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The casting: every ritual in order. */
  casting: RitualSentence[];
  /** The index of the current ritual in `casting` (zero-based). */
  ritual: number;
  /** The number of rituals of the casting (`casting.length`). */
  rituals: number;
  mage: Mage;
  crystals: Crystal[];
  /** The index of the next word to strike. */
  next: number;
  /** The bolt in flight, or null (one at a time). */
  bolt: Bolt | null;
  /** The crystal the staff points at (keyboard aim), or null when none can be cast. */
  aimId: string | null;
  /** Words struck in the casting, and rituals cleared. */
  struck: number;
  ritualsCleared: number;
  /** Bolts cast so far (the id counter of bolts). */
  casts: number;
}

// ---------------------------------------------------------------- commands

export type AstralMageCommand =
  /** Moves the staff to the next live crystal to the left (-1) or to the right (1). */
  | { type: 'aim'; dir: -1 | 1 }
  /** Casts a bolt at a crystal (a tap), or at the aimed crystal when `crystalId` is missing. */
  | { type: 'cast'; crystalId?: string };

// ---------------------------------------------------------------- events

export interface CrystalSpawn {
  id: string;
  word: string;
  kind: CrystalKind;
  index: number;
  x: number;
  z: number;
}

export type AstralMageEvent =
  | { type: 'ritualStarted'; ritualId: string; sentenceId: string; words: string[]; crystals: CrystalSpawn[] }
  /** The staff points at another crystal. */
  | { type: 'aimed'; crystalId: string }
  /** A bolt leaves the staff. */
  | { type: 'boltCast'; boltId: string; targetId: string }
  /** The bolt hit the next word: the crystal shatters into the sentence. */
  | { type: 'crystalStruck'; id: string; index: number }
  /** The bolt hit another crystal; it dims for 1.5 s. Counts a reading attempt. */
  | { type: 'crystalFizzled'; id: string }
  | { type: 'ritualCleared'; ritualId: string; sentenceId: string }
  | { type: 'castingComplete'; rituals: number };

export type AstralMageEventType = AstralMageEvent['type'];

/** Every event type the core emits; there is no game over. */
export const ASTRAL_MAGE_EVENT_TYPES: readonly AstralMageEventType[] = [
  'ritualStarted',
  'aimed',
  'boltCast',
  'crystalStruck',
  'crystalFizzled',
  'ritualCleared',
  'castingComplete',
];
