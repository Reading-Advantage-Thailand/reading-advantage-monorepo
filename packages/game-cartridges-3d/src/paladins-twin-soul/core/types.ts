/**
 * Paladin's Twin Soul rules core: state, commands, and events. The view reads the state after
 * every call and plays the events in order; every event carries ids and plain values, never
 * object references. There is no timer and no game over.
 */

/** The monsters of a run, in order: the shades serve one monster at a time. */
export const MONSTER_KINDS = ['skeleton', 'mimic', 'dragon-fire'] as const;

export type MonsterKind = (typeof MONSTER_KINDS)[number];

/** The heroes strike in this order, one per freed soul. The paladin is the knight. */
export const HEROES = ['knight', 'wizard', 'cleric'] as const;

export type HeroId = (typeof HEROES)[number];

/** A target word of the run, with its evidence counters. */
export interface TargetWord {
  /** The story vocabulary id (the evidence `itemId`). */
  id: string;
  term: string;
  translation: string;
  /** Shades the student struck while this word was the target. */
  attempts: number;
  /** True when the first shade struck held this word's term. */
  correctFirstTry: boolean;
  /** True once the shade with this word's term was struck. */
  solved: boolean;
}

/** One shade of the formation. It carries the English term of `wordId`. */
export interface Shade {
  /** Unique within the run ("w2s3": wave 2, shade 3). */
  id: string;
  wordId: string;
  term: string;
  /** True once the shade was struck and fell (a wrong shade only). */
  fallen: boolean;
}

export interface Monster {
  kind: MonsterKind;
  /** Souls left to free until the monster falls. */
  hp: number;
  maxHp: number;
}

export interface TwinSoulState {
  phase: 'playing' | 'victory';
  helper: boolean;
  /** Every target word of the run, in target order. */
  targets: TargetWord[];
  /** Zero-based wave = index of the target word. */
  targetIndex: number;
  targetCount: number;
  /** The meaning to match now (the soul the captor holds); null after the last one. */
  target: { itemId: string; term: string; translation: string } | null;
  /** The shades of this wave, in formation order (row by row). Empty after the last wave. */
  shades: Shade[];
  monster: Monster | null;
  monsterIndex: number;
  courage: number;
  maxCourage: number;
  /** Souls freed so far: the twin soul grows with every freed word. */
  twins: number;
  /** Points of the run: a fixed number per freed soul. */
  score: number;
  /** Index into HEROES of the hero who strikes next. */
  heroTurn: number;
  /** Wrong shades struck (they fall; the monster strikes). */
  misses: number;
  started: boolean;
}

// ---------------------------------------------------------------- commands

export type TwinSoulCommand =
  /** Once, when the stage is ready: shows the first monster and wave. */
  | { type: 'start' }
  /** Strike one shade of the formation. */
  | { type: 'strike'; shade: string };

// ---------------------------------------------------------------- events

export interface ShadeShown {
  id: string;
  wordId: string;
  term: string;
}

export type TwinSoulEvent =
  | { type: 'monsterAppeared'; kind: MonsterKind }
  /** A new wave: the meaning to find and the shades that carry the terms. */
  | { type: 'waveShown'; itemId: string; translation: string; shades: ShadeShown[] }
  /** The captor shade seizes the twin soul of the target word. */
  | { type: 'captured'; shade: string }
  /** A wrong shade fell: it holds the term of another word. */
  | { type: 'shadeFell'; shade: string; wordId: string }
  | { type: 'monsterStrike'; courage: number }
  | { type: 'rest'; courage: number }
  /** The captor fell: the twin soul is free. `firstTry` = no wrong shade fell for this word. */
  | { type: 'soulFreed'; shade: string; itemId: string; firstTry: boolean; twins: number; points: number }
  | { type: 'heroStrike'; hero: HeroId; damage: number }
  | { type: 'monsterDefeated'; kind: MonsterKind }
  /** The shades left in the formation scatter after the soul is free. */
  | { type: 'shadesScattered'; shades: string[] }
  /** Unknown shade, a fallen shade, or a command after the end: nothing happens. */
  | { type: 'strikeRejected'; shade: string }
  | { type: 'victory' };

export type TwinSoulEventType = TwinSoulEvent['type'];

/** Every event type the core emits; there is no game over. */
export const TWIN_SOUL_EVENT_TYPES: readonly TwinSoulEventType[] = [
  'monsterAppeared',
  'waveShown',
  'captured',
  'shadeFell',
  'monsterStrike',
  'rest',
  'soulFreed',
  'heroStrike',
  'monsterDefeated',
  'shadesScattered',
  'strikeRejected',
  'victory',
];
