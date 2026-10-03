/**
 * Magic Defense rules core: state, commands, and events (design: docs/game-magic-defense-3d.md).
 * The view reads the state after every call and animates the events in order; every event
 * carries ids and plain values, never object references.
 */

/** The monsters of the formations; a wave alternates them from castle to castle. */
export const MONSTER_KINDS = ['skeleton', 'mimic'] as const;

export type MonsterKind = (typeof MONSTER_KINDS)[number];

/** The party. Each hero ward guards one castle (castle 0, 1, 2); the Wizard also casts the counter spell. */
export const HEROES = ['knight', 'wizard', 'cleric'] as const;

export type HeroId = (typeof HEROES)[number];

/** The hero who casts the counter spell. */
export const CASTER: HeroId = 'wizard';

/** The hero who guards a castle. */
export const wardOf = (castle: number): HeroId => HEROES[castle % HEROES.length]!;

/** A word of the run and its evidence counters. */
export interface TargetWord {
  /** The story vocabulary id (the evidence `itemId`). */
  id: string;
  term: string;
  translation: string;
  /** One-based wave that holds this word. */
  wave: number;
  /** Spells chosen while this word was the prompt. */
  attempts: number;
  /** True when the first spell chosen was the right word. */
  correctFirstTry: boolean;
  /** True once the right spell was cast. */
  solved: boolean;
}

/** One enemy caster of the formation of the wave; it stands in front of the castle of its lane. */
export interface WaveEnemy {
  id: string;
  lane: number;
  kind: MonsterKind;
}

/** One spell word of the round. */
export interface Choice {
  /** Position on the card. */
  index: number;
  wordId: string;
  term: string;
  /** True after this spell failed in this round. */
  blocked: boolean;
}

/**
 * The incoming missile (its Thai meaning), the castle it falls on, the enemy that cast it, and
 * the spell words to choose from. Exactly one choice is the word of the missile.
 */
export interface Round {
  wordId: string;
  prompt: string;
  /** The castle (lane) under the missile. */
  castle: number;
  enemyId: string;
  choices: Choice[];
}

export interface MagicDefenseState {
  phase: 'playing' | 'victory';
  helper: boolean;
  /** Every word of the run, in target order. */
  targets: TargetWord[];
  targetCount: number;
  /** One-based wave number. */
  wave: number;
  waveCount: number;
  /** Words in the current wave, and how many are done. */
  waveSize: number;
  waveDone: number;
  /** The enemies of the current wave (one per castle). */
  enemies: WaveEnemy[];
  /** The hearts of each castle. A castle at 0 is in ruins until the team rests. */
  castles: number[];
  maxCastleHealth: number;
  /** The missile now; null once the run is won. */
  round: Round | null;
  coins: number;
  /** Storm mana, 0 to `maxMana`. */
  mana: number;
  maxMana: number;
  /** Right spells in a row. */
  streak: number;
  bestStreak: number;
  /** Spells chosen. */
  casts: number;
  /** After the `start` command. */
  started: boolean;
}

// ---------------------------------------------------------------- commands

export type MagicDefenseCommand =
  /** Once, when the stage is ready: replays `waveAppeared` and `roundShown` for the view. */
  | { type: 'start' }
  /** Choose a spell word of the round (the `index` of a choice). */
  | { type: 'cast'; choice: number }
  /** Use a full storm: every castle is mended to full hearts. */
  | { type: 'storm' };

// ---------------------------------------------------------------- events

export type MagicDefenseEvent =
  | { type: 'waveAppeared'; wave: number; waveCount: number; enemies: WaveEnemy[] }
  | { type: 'roundShown'; round: Round }
  /** A spell was cast; `correct` is true when it is the word of the missile. */
  | { type: 'cast'; choice: number; wordId: string; correct: boolean; castle: number; enemyId: string; correctText: string; streak: number }
  | { type: 'scored'; coins: number; mana: number }
  /** A missile broke on a castle: it keeps `health` hearts. */
  | { type: 'castleHit'; castle: number; enemyId: string; health: number }
  /** Every castle fell: the heroes rest and the castles stand again. */
  | { type: 'rest'; castles: number[] }
  | { type: 'stormCast'; castles: number[] }
  | { type: 'waveCleared'; wave: number; enemies: WaveEnemy[] }
  | { type: 'rejected'; command: string }
  | { type: 'victory' };

export type MagicDefenseEventType = MagicDefenseEvent['type'];

/** Every event type the core emits; there is no game over. */
export const MAGIC_DEFENSE_EVENT_TYPES: readonly MagicDefenseEventType[] = [
  'waveAppeared',
  'roundShown',
  'cast',
  'scored',
  'castleHit',
  'rest',
  'stormCast',
  'waveCleared',
  'rejected',
  'victory',
];
