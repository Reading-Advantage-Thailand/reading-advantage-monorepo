/**
 * Castle Defense rules core: state, commands, and events (design: docs/game-castle-defense-3d.md).
 * The view reads the state after every call and animates the events in order; every event
 * carries ids and plain values, never object references.
 */

/** The party. Post i of the castle wall is kept by hero i; a tower on that post fires through that hero. */
export const HEROES = ['knight', 'wizard', 'cleric'] as const;

export type HeroId = (typeof HEROES)[number];

/** The tower posts of the wall: one per hero. */
export const POSTS = HEROES.length;

/** The hero who keeps a post. */
export const keeperOf = (post: number): HeroId => HEROES[post % HEROES.length]!;

/** The attackers: soldiers (skeletons), tanks (mimics), and the boss (the fire dragon). */
export const ENEMY_TYPES = ['soldier', 'tank', 'boss'] as const;

export type EnemyType = (typeof ENEMY_TYPES)[number];

/** The monster the stages show for an attacker type. */
export const KIND_OF: Readonly<Record<EnemyType, 'skeleton' | 'mimic' | 'dragon-fire'>> = {
  soldier: 'skeleton',
  tank: 'mimic',
  boss: 'dragon-fire',
};

/** One sentence of the run (one wave) and its evidence counters. */
export interface WaveSentence {
  /** The story sentence id (the evidence `itemId`). */
  id: string;
  text: string;
  /** The words in sentence order; punctuation stays attached. */
  words: string[];
  translation?: string;
  paragraph?: number;
  /** Wrong words chosen while building this sentence. */
  wrongs: number;
  /** True once the student chose any word of this sentence. */
  started: boolean;
  /** True once the tower of this sentence stands and the wave is beaten. */
  cleared: boolean;
}

/** One attacker of the wave. `hits` is what it still takes to fall. */
export interface Attacker {
  id: string;
  type: EnemyType;
  kind: 'skeleton' | 'mimic' | 'dragon-fire';
  lane: number;
  hits: number;
  maxHits: number;
}

/** One word on the card. Exactly one choice of a step is the next word of the sentence. */
export interface Choice {
  index: number;
  /** The word as the card shows it, without punctuation. */
  word: string;
  /** True for the next word of the sentence. */
  right: boolean;
  /** True after this word failed in this step. */
  blocked: boolean;
}

/** The step of the build: the next word of the sentence and the words to choose from. */
export interface Step {
  /** Zero-based index of the word to find. */
  index: number;
  choices: Choice[];
}

/** One tower post: level 0 is empty. */
export interface Post {
  post: number;
  hero: HeroId;
  level: number;
}

export interface CastleDefenseState {
  phase: 'playing' | 'victory';
  helper: boolean;
  /** The sentences of the run, one per wave, in wave order. */
  shift: WaveSentence[];
  /** One-based wave number. */
  wave: number;
  waveCount: number;
  /** `collect`: build the sentence word by word. `place`: the sentence is built, choose a post. */
  stage: 'collect' | 'place';
  /** The words of the current sentence chosen so far. */
  built: string[];
  /** The current step; null while placing and after the victory. */
  step: Step | null;
  attackers: Attacker[];
  posts: Post[];
  /** Hearts of the castle. At 0 the heroes rest and the hearts return. */
  hearts: number;
  maxHearts: number;
  coins: number;
  /** Right words in a row. */
  streak: number;
  bestStreak: number;
  /** Words chosen. */
  picks: number;
  towersBuilt: number;
  /** After the `start` command. */
  started: boolean;
}

// ---------------------------------------------------------------- commands

export type CastleDefenseCommand =
  /** Once, when the stage is ready: replays `waveAppeared` and `stepShown` for the view. */
  | { type: 'start' }
  /** Choose a word of the step (the `index` of a choice). */
  | { type: 'pick'; choice: number }
  /** Place the tower of the built sentence on a post. */
  | { type: 'build'; post: number };

// ---------------------------------------------------------------- events

export interface ShotSummary {
  post: number;
  hero: HeroId;
  enemyId: string;
  hits: number;
  hitsLeft: number;
  fell: boolean;
}

export type CastleDefenseEvent =
  | { type: 'waveAppeared'; wave: number; waveCount: number; sentenceId: string; attackers: Attacker[] }
  | { type: 'stepShown'; step: Step; built: string[] }
  /** A word was chosen; `correct` is true for the next word of the sentence. */
  | { type: 'picked'; choice: number; word: string; correct: boolean; index: number; streak: number }
  | { type: 'scored'; coins: number }
  /** A wrong word: an attacker strikes the castle and the hearts fall. */
  | { type: 'attackerStrike'; enemyId: string; hero: HeroId; hearts: number }
  | { type: 'rest'; hearts: number }
  /** The sentence is built: choose a post for its tower. */
  | { type: 'sentenceBuilt'; wave: number; posts: Post[] }
  | { type: 'towerBuilt'; post: number; hero: HeroId; level: number; coins: number }
  /** One round of fire: every tower shoots the front attacker. */
  | { type: 'volley'; round: number; shots: ShotSummary[] }
  | { type: 'waveCleared'; wave: number; attackers: Attacker[] }
  | { type: 'rejected'; command: string }
  | { type: 'victory' };

export type CastleDefenseEventType = CastleDefenseEvent['type'];

/** Every event type the core emits; there is no game over. */
export const CASTLE_DEFENSE_EVENT_TYPES: readonly CastleDefenseEventType[] = [
  'waveAppeared',
  'stepShown',
  'picked',
  'scored',
  'attackerStrike',
  'rest',
  'sentenceBuilt',
  'towerBuilt',
  'volley',
  'waveCleared',
  'rejected',
  'victory',
];
