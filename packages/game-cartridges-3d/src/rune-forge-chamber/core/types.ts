/**
 * Rune Forge Chamber rules core: state, commands, and events (section 4 of
 * docs/game-rune-forge-chamber-3d.md). The view reads the state every frame (the orbiting runes,
 * the strike) and animates from the events; every event carries ids, never references.
 * Positions are meters on the forge floor: `x` to the right, `z` toward the camera.
 */

// ---------------------------------------------------------------- state

/** One sentence of the forge: the blade the student builds word by word, and its reading record. */
export interface ForgeSentence {
  /** The sentence id from the story (the evidence `itemId`); `s-1`, `s-2`, ... for an APK sentence list. */
  id: string;
  /** The blade id: `blade-1`, `blade-2`, ... */
  bladeId: string;
  /** The sentence as the student reads it. */
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  /** Zero-based story paragraph the sentence comes from, when known. */
  paragraph?: number;
  /** Runes that were the wrong word in this sentence (reading attempts beyond the first). */
  refusals: number;
  /** True once the student chose any rune of this sentence. */
  started: boolean;
  /** True once the whole sentence is forged. */
  forged: boolean;
}

/** An orbiting rune: it holds one word of the current sentence. */
export interface Rune {
  /** `r1`, `r2`, ... in orbit order; the ids repeat in every wave. */
  id: string;
  word: string;
  /** The angle on the orbit when the wave started, in radians (the orbit turns on top of it). */
  baseAngle: number;
  /** The place now (a pure function of the base angle and the game time). */
  x: number;
  z: number;
  /** Milliseconds left of the dim after a wrong choice (0 = bright and choosable). */
  dimMs: number;
}

/** The right rune being struck into the blade; the next wave comes when `ms` runs out. */
export interface Strike {
  runeId: string;
  ms: number;
}

export interface RuneForgeChamberState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The forge: every sentence in order. */
  forge: ForgeSentence[];
  /** The index of the current sentence in `forge` (zero-based). */
  sentence: number;
  /** The number of sentences (`forge.length`). */
  sentences: number;
  /** The index of the next word to forge in the current sentence. */
  next: number;
  /** The runes of the current wave, in orbit order. */
  runes: Rune[];
  /** The rune the keyboard cursor points at, or null when there is none. */
  aimId: string | null;
  /** The strike in progress, or null. */
  strike: Strike | null;
  /** Wrong runes chosen for the current word (0 = a right choice now is first try). */
  misses: number;
  /** The turn of the orbit in radians (grows with the game time). */
  rotation: number;
  /** Words forged in all sentences, and sentences forged. */
  wordsForged: number;
  sentencesForged: number;
}

// ---------------------------------------------------------------- commands

export type RuneForgeChamberCommand =
  /** Moves the cursor to the previous (-1) or next (1) rune. */
  | { type: 'aim'; dir: -1 | 1 }
  /** Chooses a rune (a tap), or the rune under the cursor when `runeId` is missing. */
  | { type: 'choose'; runeId?: string };

// ---------------------------------------------------------------- events

export interface RuneSpawn {
  id: string;
  word: string;
  x: number;
  z: number;
}

export type RuneForgeChamberEvent =
  | { type: 'sentenceStarted'; bladeId: string; sentenceId: string; words: string[] }
  /** The runes of the next word orbit the anvil. */
  | { type: 'waveStarted'; sentence: number; next: number; runes: RuneSpawn[] }
  | { type: 'aimed'; runeId: string }
  /** The right rune: it strikes into the blade. */
  | { type: 'runeStruck'; runeId: string; word: string; index: number; first: boolean }
  /** A wrong rune: it dims for 1.5 s. Counts a reading attempt. */
  | { type: 'runeFizzled'; runeId: string; word: string }
  | { type: 'sentenceForged'; bladeId: string; sentenceId: string }
  | { type: 'forgeComplete'; sentences: number };

export type RuneForgeChamberEventType = RuneForgeChamberEvent['type'];

/** Every event type the core emits; there is no game over. */
export const RUNE_FORGE_CHAMBER_EVENT_TYPES: readonly RuneForgeChamberEventType[] = [
  'sentenceStarted',
  'waveStarted',
  'aimed',
  'runeStruck',
  'runeFizzled',
  'sentenceForged',
  'forgeComplete',
];
