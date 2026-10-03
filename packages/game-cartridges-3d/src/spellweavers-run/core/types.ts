/**
 * Spellweaver's Run rules core: state, commands, and events (docs/game-spellweavers-run-3d.md).
 * The view reads the state every frame (distance, speed, the round's orbs) and animates from the
 * events; every event carries ids and numbers, never references.
 */

// ---------------------------------------------------------------- content

/** One sentence of the run and what the student did with it. */
export interface RunSentence {
  /** The sentence id, equal to the story sentence id (the evidence `itemId`). */
  id: string;
  text: string;
  /** The words (tokens) in the correct order; punctuation stays attached to its word. */
  words: string[];
  /** The prompt shown above the run (the student's language), when the story has one. */
  translation?: string;
  /** Zero-based paragraph of the story (the reading look-back). */
  paragraph?: number;
  /** Lane choices that missed the next word of this sentence. */
  misses: number;
  /** True once the student chose a lane for this sentence. */
  started: boolean;
  /** True once every word of the sentence was collected. */
  cleared: boolean;
}

/** An orb of a round: the word it carries. */
export interface Orb {
  text: string;
}

/** One round: the orbs for the next word of the sentence. */
export interface Round {
  id: string;
  /** Index of the sentence in the run. */
  sentence: number;
  /** Index of the word in the sentence. */
  wordIndex: number;
  /** The orbs from left to right; exactly one carries the next word. */
  options: Orb[];
  /** The lane of the right orb. */
  correctLane: number;
  /** Distance of the orbs along the path, in meters. */
  orbsAt: number;
  /** The lane the student picked, or null until then. */
  chosen: number | null;
  /** True when this round repeats a word after a missed choice. */
  retry: boolean;
}

// ---------------------------------------------------------------- state

export type SpellweaversPhase = 'running' | 'finale' | 'complete';

export interface SpellweaversState {
  phase: SpellweaversPhase;
  helper: boolean;
  /** Lanes per round: 2 in Helper mode, 3 otherwise. */
  lanes: number;
  /** Game time since the start, in milliseconds (the sum of the steps). */
  timeMs: number;
  /** Distance run along the path, in meters. */
  distance: number;
  /** Speed along the path, in meters per second; 0 while waiting, resting, or at the portal. */
  speed: number;
  /** True while the wizard waits before orbs with no choice. */
  waiting: boolean;
  /** Time left of the rest after a missed orb, in milliseconds; 0 when not resting. */
  restMs: number;
  /** Courage: a missed orb costs one; at 0 the wizard rests and gets it all back. Never ends the run. */
  courage: number;
  score: number;
  /** The sentences of the run, in the seeded order. */
  sentences: RunSentence[];
  /** Index of the current sentence. */
  sentence: number;
  /** Words of the current sentence collected so far. */
  word: number;
  /** The current round, or null before the first tick and after the last orbs. */
  round: Round | null;
  /** Rounds started so far (retries included). */
  rounds: number;
  /** Game time until which the speed is the boost. */
  boostUntilMs: number;
  /** Distance of the portal, set when the last sentence is cast. */
  portalAt: number | null;
  /** Game time when the run completes after the wizard reaches the portal. */
  completeAtMs: number;
  /** Words collected so far in all sentences. */
  collected: number;
}

// ---------------------------------------------------------------- commands

export type SpellweaversCommand =
  /** The student picks the orb of a lane of the current round (0 = left). */
  { type: 'choose'; lane: number };

// ---------------------------------------------------------------- events

export type SpellweaversEvent =
  | { type: 'roundStarted'; roundId: string; sentence: number; wordIndex: number; options: Orb[]; orbsAt: number; retry: boolean }
  /** The wizard reached the orbs with no choice; it waits. */
  | { type: 'waiting'; roundId: string }
  | { type: 'laneChosen'; roundId: string; lane: number; correct: boolean; correctLane: number }
  | { type: 'wordCollected'; sentence: number; wordIndex: number; text: string }
  /** A missed orb cost one courage. */
  | { type: 'courageLost'; courage: number }
  /** The wizard rested and returned with all its courage. */
  | { type: 'rested'; courage: number }
  /** The last word of a sentence was collected: the spell is cast. */
  | { type: 'sentenceCast'; sentence: number; id: string }
  | { type: 'portalAppeared'; at: number }
  | { type: 'runComplete'; score: number };

export type SpellweaversEventType = SpellweaversEvent['type'];

/** Every event type the core emits; there is no game over. */
export const SPELLWEAVERS_EVENT_TYPES: readonly SpellweaversEventType[] = [
  'roundStarted',
  'waiting',
  'laneChosen',
  'wordCollected',
  'courageLost',
  'rested',
  'sentenceCast',
  'portalAppeared',
  'runComplete',
];
