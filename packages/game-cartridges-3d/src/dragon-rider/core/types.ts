/**
 * Dragon Rider 3D rules core: state, commands, and events (docs/game-dragon-rider-3d.md). Two
 * stone gates fly toward the rider and hold in front of it until the student chooses. The view
 * reads the state every frame and animates from the events; every event carries ids, never
 * references.
 */

/** One story word of the ride and what the student did with it. */
export interface RideWord {
  /** The word id, equal to the story vocabulary id (the evidence `itemId`). */
  id: string;
  /** The word's position in the input: in answer audio, its question and its clip. */
  position: number;
  term: string;
  /** The meaning on the right gate. */
  translation: string;
  /** Gate choices for this word, right and wrong. */
  attempts: number;
  /** True once the student chose the right gate for this word. */
  solved: boolean;
  /** True once a missed word was queued a second time; a word returns at most once. */
  returned: boolean;
}

/** A gate of a round; `id` is the id of the word whose meaning the gate carries. */
export interface GateOption {
  id: string;
  text: string;
  /** The input position of that word: the clip the gate plays in answer audio. */
  position: number;
}

/** One round: a word and its two gates, flying toward the rider. */
export interface Round {
  id: string;
  itemId: string;
  term: string;
  /** The meaning: the banner in answer audio. */
  translation: string;
  /** The word's input position: the question in answer audio. */
  position: number;
  /** The gates, left then right; one carries the word's meaning. */
  options: GateOption[];
  /** Distance from the rider to the gates, in meters. */
  gap: number;
  /** The gate the student chose (0 = left), or null until then. */
  chosen: number | null;
  /** The right gate, known to the view once chosen. */
  correctGate: number | null;
  /** Answer audio: the gate the rider steers to; the view commits it after its clip. */
  held: number | null;
}

export type DragonRiderPhase = 'riding' | 'duel' | 'complete';

export interface DragonRiderState {
  phase: DragonRiderPhase;
  /**
   * Read to Select Audio: the banner shows the meaning, the gates play the English words, `choose`
   * only steers to a gate, and the view resolves it with `commit` after its clip played at the gate.
   */
  answerAudio: boolean;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** Distance ridden, in meters; the land scrolls with it. It stops while the rider holds. */
  distance: number;
  /** True while the rider holds in front of gates with no choice. */
  waiting: boolean;
  /** Dragons in the flock, the rider's own included; never below 1. */
  flock: number;
  coins: number;
  words: RideWord[];
  /** Word ids of rounds not started yet; a missed word joins the end once. */
  queue: string[];
  round: Round | null;
  /** Zero-based index of the current round (the last one after the ride). */
  roundIndex: number;
  /** Rounds known so far: every word once plus the returns so far. */
  total: number;
  /** Gate choices so far; the dark dragon's power comes from this. */
  choices: number;
  /** Dark dragon power: max(3, ceil(choices / 2)); 0 before the duel. */
  bossPower: number;
  /** Dark dragon strength left. */
  bossHp: number;
  /** Dragons still fighting in the duel; the others rest. */
  active: number;
  /** Times the resting dragons returned to the fight. */
  rallies: number;
  /** Game time of the next exchange, or of the dark dragon's fall after the last one. */
  nextBeatMs: number;
}

export type DragonRiderCommand =
  /** The student chooses a gate of the current round (0 = left, 1 = right); in answer audio, steers to it. */
  | { type: 'choose'; gate: number }
  /** Answer audio: resolve the gate the rider holds at (the view confirmed its clip). */
  | { type: 'commit' };

export type DragonRiderEvent =
  | { type: 'roundStarted'; roundId: string; itemId: string; term: string; translation: string; position: number; options: GateOption[] }
  /** Answer audio: the rider steers to this gate. */
  | { type: 'gateHeld'; roundId: string; gate: number }
  /** Answer audio: the rider holds at its gate; the view plays the gate's clip, then commits. */
  | { type: 'gateReached'; roundId: string; gate: number }
  /** The rider holds in front of the gates. */
  | { type: 'waiting'; roundId: string }
  | { type: 'gateChosen'; roundId: string; gate: number; correct: boolean; correctGate: number }
  | { type: 'flockGrew'; count: number }
  | { type: 'flockShrank'; count: number }
  | { type: 'wordReturns'; itemId: string }
  | { type: 'bossAppeared'; flock: number; power: number }
  /** One exchange: the dark dragon loses one strength; one dragon rests when others remain. */
  | { type: 'exchange'; bossHp: number; active: number }
  /** The resting dragons return to the fight. */
  | { type: 'rally'; active: number }
  | { type: 'rideComplete'; flock: number; coins: number };

export type DragonRiderEventType = DragonRiderEvent['type'];

/** Every event type the core emits; there is no game over. */
export const DRAGON_RIDER_EVENT_TYPES: readonly DragonRiderEventType[] = [
  'roundStarted',
  'gateHeld',
  'gateReached',
  'waiting',
  'gateChosen',
  'flockGrew',
  'flockShrank',
  'wordReturns',
  'bossAppeared',
  'exchange',
  'rally',
  'rideComplete',
];
