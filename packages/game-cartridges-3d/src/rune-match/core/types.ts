/**
 * Rune Match rules core: state, commands, and events (section 6 of docs/game-rune-match-3d.md).
 * The view reads the state after every call and animates the events in order; every event
 * carries cells, ids, and plain values, never object references.
 */

// ---------------------------------------------------------------- content kinds

/** The monsters of a run, in order: one per 4 target words, the dragon for the last words. */
export const MONSTER_KINDS = ['skeleton', 'mimic', 'dragon-fire'] as const;

export type MonsterKind = (typeof MONSTER_KINDS)[number];

/** The heroes strike in this order, one per target line. */
export const HEROES = ['knight', 'wizard', 'cleric'] as const;

export type HeroId = (typeof HEROES)[number];

// ---------------------------------------------------------------- the board

/** A board position; row 0 is the top row, new runes enter there. */
export interface Cell {
  row: number;
  col: number;
}

export type RuneKind = 'word' | 'heal' | 'shield';

/** One rune on the board. A word rune shows `text`, the term or the translation of the story word `wordId`. */
export interface Rune {
  /** Unique within the run ("r17"); the view keys its rune objects by it. */
  id: string;
  kind: RuneKind;
  wordId?: string;
  text?: string;
}

/** A target word of the run, with its evidence counters. */
export interface TargetWord {
  /** The story vocabulary id (the evidence `itemId`). */
  id: string;
  term: string;
  translation: string;
  /**
   * True when the prompt shows the translation (a Thai prompt); false when it shows the term. Each
   * word has its own seeded direction. The runes of a word show the term or the translation at
   * random, so the player must recall which runes mean the prompt in either language.
   */
  reverse: boolean;
  /** Line-making swaps while this word was the target. */
  attempts: number;
  /** True when the first line made for this word was its own line. */
  correctFirstTry: boolean;
  /** True once a line of this word burst while it was the target. */
  solved: boolean;
}

export interface Monster {
  kind: MonsterKind;
  /** Target lines left until the monster falls. */
  hp: number;
  maxHp: number;
}

export interface RuneMatchState {
  phase: 'playing' | 'victory';
  helper: boolean;
  rows: number;
  cols: number;
  /** `board[row][col]`. */
  board: Rune[][];
  /** Every target word of the run, in target order. */
  targets: TargetWord[];
  targetIndex: number;
  targetCount: number;
  /** The word to find now; null after the last one. `term` is the prompt text the player reads. */
  target: { itemId: string; term: string } | null;
  /**
   * The word ids the board draws from, in slot order: the target first, then the decoys. A new
   * target that is not in the palette takes the slot of the old one. The view maps a slot to a
   * rune color; a rune of a word no longer in the palette is an old rune.
   */
  palette: string[];
  monster: Monster | null;
  /** Zero-based index into the monsters of the run. */
  monsterIndex: number;
  courage: number;
  maxCourage: number;
  /** True while a shield line protects the team from the next monster strike. */
  shield: boolean;
  coins: number;
  /** Index into HEROES of the hero who strikes next. */
  heroTurn: number;
  /** Swaps of neighbors that were carried out (line or not). */
  swaps: number;
  /** True after the `start` command. */
  started: boolean;
  /** Counter for rune ids. */
  spawned: number;
}

// ---------------------------------------------------------------- commands

export type RuneMatchCommand =
  /** Once, when the stage is ready: replays `monsterAppeared` and `targetShown` for the view. */
  | { type: 'start' }
  /** Swap two neighboring runes. */
  | { type: 'swap'; a: Cell; b: Cell };

// ---------------------------------------------------------------- events

export type RuneMatchEvent =
  | { type: 'targetShown'; itemId: string; term: string }
  /** The runes of `a` and `b` changed places; a wrong swap emits it twice (there and back). */
  | { type: 'swapped'; a: Cell; b: Cell }
  /** The lines of one cascade step; `kinds` has one entry per line (a word id, 'heal', or 'shield'). */
  | { type: 'linesBurst'; cascade: number; cells: Cell[]; kinds: string[]; target: boolean; coins: number }
  /** Runes fell into the burst cells and new runes entered from the top; also the placed runes of a guaranteed move (`moves` empty). */
  | { type: 'runesFell'; moves: { from: Cell; to: Cell }[]; runes: { cell: Cell; rune: Rune }[] }
  | { type: 'heroStrike'; hero: HeroId; damage: number }
  | { type: 'monsterStrike'; blocked: boolean; courage: number }
  | { type: 'rest'; courage: number }
  | { type: 'heal'; courage: number }
  | { type: 'shield' }
  | { type: 'monsterDefeated'; kind: MonsterKind }
  | { type: 'monsterAppeared'; kind: MonsterKind }
  /** Not neighbors or off the board: nothing happens. */
  | { type: 'swapRejected'; a: Cell; b: Cell }
  | { type: 'victory' };

export type RuneMatchEventType = RuneMatchEvent['type'];

/** Every event type the core emits; there is no game over. */
export const RUNE_MATCH_EVENT_TYPES: readonly RuneMatchEventType[] = [
  'targetShown',
  'swapped',
  'linesBurst',
  'runesFell',
  'heroStrike',
  'monsterStrike',
  'rest',
  'heal',
  'shield',
  'monsterDefeated',
  'monsterAppeared',
  'swapRejected',
  'victory',
];
