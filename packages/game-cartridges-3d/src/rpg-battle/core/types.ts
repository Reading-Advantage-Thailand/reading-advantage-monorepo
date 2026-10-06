/**
 * RPG Battle rules core: state, commands, and events (design: docs/game-rpg-battle-3d.md).
 * The view reads the state after every call and animates the events in order; every event
 * carries ids and plain values, never object references.
 */

/** The monsters of a run, in order; the fire dragon takes every word after the second group. */
export const MONSTER_KINDS = ['skeleton', 'mimic', 'dragon-fire'] as const;

export type MonsterKind = (typeof MONSTER_KINDS)[number];

export const HEROES = ['knight', 'wizard', 'cleric'] as const;

export type HeroId = (typeof HEROES)[number];

/** The action a word card casts, and the hero who does it. */
export const ACTIONS = ['slash', 'blaze', 'mend'] as const;

export type ActionKind = (typeof ACTIONS)[number];

export const HERO_OF: Readonly<Record<ActionKind, HeroId>> = { slash: 'knight', blaze: 'wizard', mend: 'cleric' };

/** A basic word hits for 1; a power word hits for 2, wins more coins, and gives courage back. */
export type Power = 'basic' | 'power';

/** A word of the run: its card, and its evidence counters. */
export interface TargetWord {
  /** The story vocabulary id (the evidence `itemId`). */
  id: string;
  term: string;
  translation: string;
  action: ActionKind;
  power: Power;
  /** Answers given for this word (right or wrong). */
  attempts: number;
  /** True when the first answer was right. */
  correctFirstTry: boolean;
  /** True once the word was answered right: its card is cast. */
  solved: boolean;
}

/** A card in the hand: the face of a word (its English term, its action, its power). */
export interface Card {
  /** Equals the word id. */
  id: string;
  term: string;
  action: ActionKind;
  power: Power;
  /** True when the word was answered wrong before. */
  retry: boolean;
}

export interface QuestionOption {
  /** A word id: the right option is the word of the card. */
  id: string;
  text: string;
}

/** The question of the played card: which meaning is the word's? */
export interface Question {
  cardId: string;
  term: string;
  options: QuestionOption[];
}

export interface Monster {
  kind: MonsterKind;
  hp: number;
  maxHp: number;
}

export interface RpgBattleState {
  phase: 'playing' | 'victory';
  helper: boolean;
  /** Every word of the run, in target order. */
  targets: TargetWord[];
  targetCount: number;
  /** Cards on offer now (up to `TUNING.handSize`). */
  hand: Card[];
  /** The played card's question; null while the student chooses a card. */
  question: Question | null;
  monster: Monster | null;
  /** Zero-based index into the monsters of the run. */
  monsterIndex: number;
  courage: number;
  maxCourage: number;
  coins: number;
  /** Right answers in a row. */
  streak: number;
  bestStreak: number;
  /** Words cast (answered right). */
  casts: number;
  /** After the `start` command. */
  started: boolean;
}

// ---------------------------------------------------------------- commands

export type RpgBattleCommand =
  /** Once, when the stage is ready: replays `monsterAppeared` and `handShown` for the view. */
  | { type: 'start' }
  /** Play a card of the hand: its question comes up. */
  | { type: 'play'; cardId: string }
  /** Put the played card back and choose again. */
  | { type: 'cancel' }
  /** Answer the question with an option id. */
  | { type: 'answer'; optionId: string };

// ---------------------------------------------------------------- events

export type RpgBattleEvent =
  | { type: 'handShown'; cards: Card[] }
  | { type: 'cardPlayed'; question: Question; action: ActionKind; power: Power }
  | { type: 'cardReturned'; cardId: string }
  /** The answer; `correctText` is the right meaning (for the feedback). */
  | { type: 'answered'; wordId: string; optionId: string; correct: boolean; correctText: string; streak: number }
  | { type: 'heroStrike'; hero: HeroId; action: ActionKind; power: Power; damage: number; coins: number }
  | { type: 'heal'; courage: number }
  | { type: 'monsterDefeated'; kind: MonsterKind }
  | { type: 'monsterAppeared'; kind: MonsterKind }
  | { type: 'monsterStrike'; courage: number }
  | { type: 'rest'; courage: number }
  | { type: 'rejected'; command: string }
  | { type: 'victory' };

export type RpgBattleEventType = RpgBattleEvent['type'];

/** Every event type the core emits; there is no game over. */
export const RPG_BATTLE_EVENT_TYPES: readonly RpgBattleEventType[] = [
  'handShown',
  'cardPlayed',
  'cardReturned',
  'answered',
  'heroStrike',
  'heal',
  'monsterDefeated',
  'monsterAppeared',
  'monsterStrike',
  'rest',
  'rejected',
  'victory',
];
