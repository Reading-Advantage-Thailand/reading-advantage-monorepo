/**
 * Archer's Revenge rules core: state, commands, and events (design: docs/game-archers-revenge-3d.md).
 * The view reads the state after every call and animates the events in order; every event
 * carries ids and plain values, never object references.
 */

/** The monsters of the formations; a wave alternates them from lane to lane. */
export const MONSTER_KINDS = ['skeleton', 'mimic'] as const;

export type MonsterKind = (typeof MONSTER_KINDS)[number];

/** The party. The Wizard is the archer who shoots; the others cheer, and each takes a monster's counterstrike in turn. */
export const HEROES = ['knight', 'wizard', 'cleric'] as const;

export type HeroId = (typeof HEROES)[number];

/** The hero who shoots the arrows. */
export const ARCHER: HeroId = 'wizard';

/** A word of the run and its evidence counters. */
export interface TargetWord {
  /** The story vocabulary id (the evidence `itemId`). */
  id: string;
  term: string;
  translation: string;
  /** One-based wave that holds this word. */
  wave: number;
  /** Arrows shot at an enemy while this word was the prompt. */
  attempts: number;
  /** True when the first arrow hit the right enemy. */
  correctFirstTry: boolean;
  /** True once the right enemy was hit. */
  solved: boolean;
}

/** One enemy of the formation of the wave. */
export interface WaveEnemy {
  id: string;
  lane: number;
  kind: MonsterKind;
}

/** One lane of the round: an enemy that carries an English term behind its shield. */
export interface Lane {
  lane: number;
  enemyId: string;
  kind: MonsterKind;
  /** The word whose term the enemy carries; the right lane carries the prompt's word. */
  wordId: string;
  term: string;
  /** True after an arrow was shot at this lane in this round: the shield held. */
  blocked: boolean;
}

/** The prompt (the Thai meaning) and the lanes: shoot the enemy that carries its English word. */
export interface Round {
  wordId: string;
  prompt: string;
  lanes: Lane[];
}

export interface ArchersRevengeState {
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
  /** The enemies of the current wave. */
  enemies: WaveEnemy[];
  /** The prompt now; null once the run is won. */
  round: Round | null;
  courage: number;
  maxCourage: number;
  coins: number;
  /** Right arrows in a row. */
  streak: number;
  bestStreak: number;
  /** Arrows shot. */
  shots: number;
  /** After the `start` command. */
  started: boolean;
}

// ---------------------------------------------------------------- commands

export type ArchersRevengeCommand =
  /** Once, when the stage is ready: replays `waveAppeared` and `roundShown` for the view. */
  | { type: 'start' }
  /** Aim at a lane and shoot an arrow. */
  | { type: 'fire'; lane: number };

// ---------------------------------------------------------------- events

export type ArchersRevengeEvent =
  | { type: 'waveAppeared'; wave: number; waveCount: number; enemies: WaveEnemy[] }
  | { type: 'roundShown'; round: Round }
  /** An arrow flew at a lane; `correct` is true when the lane carries the prompt's word. */
  | { type: 'shot'; lane: number; enemyId: string; wordId: string; correct: boolean; correctText: string; streak: number }
  | { type: 'scored'; coins: number }
  | { type: 'enemyStrike'; enemyId: string; courage: number }
  | { type: 'rest'; courage: number }
  | { type: 'waveCleared'; wave: number; enemies: WaveEnemy[] }
  | { type: 'rejected'; command: string }
  | { type: 'victory' };

export type ArchersRevengeEventType = ArchersRevengeEvent['type'];

/** Every event type the core emits; there is no game over. */
export const ARCHERS_REVENGE_EVENT_TYPES: readonly ArchersRevengeEventType[] = [
  'waveAppeared',
  'roundShown',
  'shot',
  'scored',
  'enemyStrike',
  'rest',
  'waveCleared',
  'rejected',
  'victory',
];
