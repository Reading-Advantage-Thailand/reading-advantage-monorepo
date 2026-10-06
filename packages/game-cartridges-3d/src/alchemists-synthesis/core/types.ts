/**
 * Alchemist's Synthesis rules core: state, commands, and events (section 4 of
 * docs/game-alchemists-synthesis-3d.md). The view reads the state every frame (jar glow, pour)
 * and animates from the events; every event carries ids, never references.
 */

// ---------------------------------------------------------------- content kinds

/** Ingredient models of the potion-shop pack; each jar on the bench shows one of them. */
export const INGREDIENT_KINDS = ['bottle', 'mushroom', 'apple', 'pumpkin', 'crystal-cluster', 'bread'] as const;

export type IngredientKind = (typeof INGREDIENT_KINDS)[number];

// ---------------------------------------------------------------- state

/** One word of the synthesis: a formula the student must answer with the right ingredient. */
export interface Formula {
  /** The word id from the story (the evidence `itemId`); `w-1`, `w-2`, ... for an APK vocabulary list. */
  id: string;
  /** The English word the right jar carries. */
  term: string;
  /** The meaning the formula shows (often Thai). */
  translation: string;
  /** Jars chosen for this formula, right and wrong. */
  attempts: number;
  /** True once the student chose any jar for this formula. */
  started: boolean;
  /** True once the right jar was poured into the cauldron. */
  solved: boolean;
}

/** An ingredient jar on the bench. */
export interface Jar {
  id: string;
  /** The word on the jar. */
  term: string;
  /** The formula the term belongs to. */
  wordId: string;
  kind: IngredientKind;
  /** True for the jar whose term is the formula's word. */
  correct: boolean;
  /** Milliseconds left of the dim after a wrong choice (0 = bright and choosable). */
  dimMs: number;
}

/** The right jar being poured into the cauldron; the next formula comes when `ms` runs out. */
export interface Pour {
  jarId: string;
  ms: number;
}

export interface AlchemistsSynthesisState {
  phase: 'playing' | 'complete';
  helper: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** The synthesis: every formula, in order. */
  words: Formula[];
  /** The index of the current formula in `words` (zero-based). */
  round: number;
  /** The number of formulas (`words.length`). */
  rounds: number;
  /** The jars of the current formula, in bench order. */
  jars: Jar[];
  /** The jar the keyboard cursor points at, or null when there is none. */
  aimId: string | null;
  /** The pour in progress, or null. */
  pour: Pour | null;
  /** Formulas whose elixir is brewed (the cauldron fill, 0 to `rounds`). */
  brewed: number;
  /** Right jars poured so far. */
  correct: number;
}

// ---------------------------------------------------------------- commands

export type AlchemistsSynthesisCommand =
  /** Moves the cursor to the previous (-1) or next (1) jar. */
  | { type: 'aim'; dir: -1 | 1 }
  /** Chooses a jar (a tap), or the jar under the cursor when `jarId` is missing. */
  | { type: 'choose'; jarId?: string };

// ---------------------------------------------------------------- events

export interface JarSpawn {
  id: string;
  term: string;
  kind: IngredientKind;
}

export type AlchemistsSynthesisEvent =
  | { type: 'roundStarted'; round: number; wordId: string; translation: string; jars: JarSpawn[] }
  | { type: 'aimed'; jarId: string }
  /** The right jar: it pours into the cauldron. */
  | { type: 'jarPoured'; jarId: string; wordId: string; first: boolean }
  /** A wrong jar: it dims for 1.5 s. Counts a reading attempt. */
  | { type: 'jarFizzled'; jarId: string; wordId: string }
  /** The pour ended: the cauldron holds one more word. */
  | { type: 'elixirBrewed'; round: number; wordId: string; brewed: number }
  | { type: 'synthesisComplete'; rounds: number };

export type AlchemistsSynthesisEventType = AlchemistsSynthesisEvent['type'];

/** Every event type the core emits; there is no game over. */
export const ALCHEMISTS_SYNTHESIS_EVENT_TYPES: readonly AlchemistsSynthesisEventType[] = [
  'roundStarted',
  'aimed',
  'jarPoured',
  'jarFizzled',
  'elixirBrewed',
  'synthesisComplete',
];
