/**
 * Dragon Flight 3D rules core: state, commands, and events (section 6 of
 * docs/game-dragon-flight-3d.md). The view reads the state every frame (distance, speed, the
 * round's gates) and animates from the events; every event carries ids, never references.
 */

// ---------------------------------------------------------------- content

/** One story word of the flight and what the student did with it. */
export interface FlightWord {
  /** The word id, equal to the story vocabulary id (the evidence `itemId`). */
  id: string;
  /** The English term on the banner. */
  term: string;
  /** The meaning on the correct gate. */
  translation: string;
  /** Gate choices for this word, right and wrong. */
  attempts: number;
  /** True once the student flew through the right gate for this word. */
  solved: boolean;
  /** True once a missed word was queued a second time; a word returns at most once. */
  returned: boolean;
}

/** A gate of a round; `id` is the id of the word whose meaning the gate carries. */
export interface GateOption {
  id: string;
  text: string;
}

/** One round: a word on the banner and its gates ahead. */
export interface Round {
  id: string;
  /** The word id (`FlightWord.id`). */
  itemId: string;
  term: string;
  /** The gates from left to right; one carries the word's meaning. */
  options: GateOption[];
  /** Distance of the gates along the path, in meters. */
  gatesAt: number;
  /** The gate the student picked, or null until then. */
  chosen: number | null;
  /** The right gate, known to the view once chosen. */
  correctGate: number | null;
}

// ---------------------------------------------------------------- state

export type DragonFlightPhase = 'flying' | 'boss' | 'complete';

export interface DragonFlightState {
  phase: DragonFlightPhase;
  helper: boolean;
  /** Gates per round: 2 in Helper mode, 3 otherwise. */
  gates: number;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** Distance flown along the path, in meters. */
  distance: number;
  /** Speed along the path, in meters per second; 0 while hovering or at the boss. */
  speed: number;
  /** True while the dragon hovers before gates with no choice. */
  waiting: boolean;
  /** Dragons in the flock, the player included; never below 1. */
  flock: number;
  coins: number;
  /** The flight's words, in the seeded first-pass order. */
  words: FlightWord[];
  /** Word ids of rounds not started yet; a missed word joins the end once. */
  queue: string[];
  /** The current round, or null before the first tick and after the last gates. */
  round: Round | null;
  /** Zero-based index of the current round (the last one after the flight). */
  roundIndex: number;
  /** Rounds known so far: every word once plus the returns so far. */
  total: number;
  /** Game time until which the speed is the boost. */
  boostUntilMs: number;
  /** Distance of the boss hill, set when the boss appears. */
  bossAt: number | null;
  /** Fireballs shot so far at the boss. */
  fireballs: number;
  /** Game time of the next fireball, or of the boss's fall after the last one. */
  nextFireballMs: number;
}

// ---------------------------------------------------------------- commands

export type DragonFlightCommand =
  /** The student picks a gate of the current round (0 = left). */
  { type: 'choose'; gate: number };

// ---------------------------------------------------------------- events

export type DragonFlightEvent =
  | { type: 'roundStarted'; roundId: string; itemId: string; term: string; options: GateOption[]; gatesAt: number }
  /** The dragon reached the gates with no choice; it hovers. */
  | { type: 'waiting'; roundId: string }
  | { type: 'gateChosen'; roundId: string; gate: number; correct: boolean; correctGate: number }
  | { type: 'flockGrew'; count: number }
  | { type: 'flockShrank'; count: number }
  /** A missed word is queued once more. */
  | { type: 'wordReturns'; itemId: string }
  | { type: 'bossAppeared'; flock: number }
  /** One per dragon in the flock, spaced in time. */
  | { type: 'fireball'; index: number }
  | { type: 'flightComplete'; flock: number; coins: number };

export type DragonFlightEventType = DragonFlightEvent['type'];

/** Every event type the core emits; there is no game over. */
export const DRAGON_FLIGHT_EVENT_TYPES: readonly DragonFlightEventType[] = [
  'roundStarted',
  'waiting',
  'gateChosen',
  'flockGrew',
  'flockShrank',
  'wordReturns',
  'bossAppeared',
  'fireball',
  'flightComplete',
];
