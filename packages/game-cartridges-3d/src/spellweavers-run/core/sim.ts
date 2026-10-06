/**
 * The Spellweaver's Run simulation: a real-time `Simulation` on the fixed step. The wizard runs
 * a road; ahead, a row of word orbs carries the next word of the sentence and decoys. A right
 * orb adds the word and boosts the run. A missed orb costs courage (the orbs fizzle, the wizard
 * rests, the same word comes back with new decoys; at 0 courage the wizard rests longer and gets
 * it all back). With no choice the wizard waits before the orbs. After the last sentence a portal
 * opens. No timer decides anything and there is no game over.
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { orbsFor, runOf, wordPoolOf, type SpellweaversInput } from './content.js';
import type { Round, SpellweaversCommand, SpellweaversEvent, SpellweaversState } from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  /** The most sentences in one run. */
  maxSentences: 5,
  /** Orbs per row, and in Helper mode. */
  lanes: 3,
  lanesHelper: 2,
  /** Speeds in meters per second; the boost lasts `boostMs` after a right orb. */
  cruiseSpeed: 8,
  boostSpeed: 12,
  boostMs: 1000,
  /** Distance from one row of orbs to the next, in meters. */
  orbSpacing: 26,
  /** The wizard waits this far before orbs with no choice, in meters. */
  hoverBefore: 7,
  /** Rest after a missed orb, and after the last courage is gone. */
  restMs: 1600,
  restEmptyMs: 2600,
  /** Courage at the start and after a rest. */
  courage: 3,
  /** Score: a word on the first try, a word after a miss, a sentence cast. */
  wordScore: 10,
  retryWordScore: 5,
  sentenceScore: 50,
  /** The portal is this far past the last orbs; the run completes this long after the wizard arrives. */
  portalDistance: 30,
  portalHoldMs: 1800,
} as const;

export interface SpellweaversOptions {
  seed: number;
  helper: boolean;
}

export type SpellweaversSimulation = Simulation<SpellweaversState, SpellweaversCommand, SpellweaversEvent>;

/** Orbs per row for a mode. */
export function laneCountFor(helper: boolean): number {
  return helper ? TUNING.lanesHelper : TUNING.lanes;
}

/** The lane of the current round that carries the next word, or null without an open round. */
export function correctLaneOf(state: SpellweaversState): number | null {
  return state.round ? state.round.correctLane : null;
}

const STEP_S = STEP_MS / 1000;

export function createSpellweaversRun(input: SpellweaversInput, options: SpellweaversOptions): SpellweaversSimulation {
  const rng: Rng = createRng(options.seed);
  const sentences = runOf(input, rng, TUNING.maxSentences);
  const pool = wordPoolOf(input);

  const state: SpellweaversState = {
    phase: 'running',
    helper: options.helper,
    lanes: laneCountFor(options.helper),
    timeMs: 0,
    distance: 0,
    speed: TUNING.cruiseSpeed,
    waiting: false,
    restMs: 0,
    courage: TUNING.courage,
    score: 0,
    sentences,
    sentence: 0,
    word: 0,
    round: null,
    rounds: 0,
    boostUntilMs: 0,
    portalAt: null,
    completeAtMs: 0,
    collected: 0,
  };
  // A run with no sentences is over before it starts (the manifest needs 3 sentences).
  if (sentences.length === 0) state.phase = 'complete';

  // ------------------------------------------------------------ rounds

  /** Starts the round for the next word of the current sentence with its orbs `orbsAt` ahead. */
  const startRound = (orbsAt: number, retry: boolean, events: SpellweaversEvent[]): void => {
    const sentence = sentences[state.sentence]!;
    const answer = sentence.words[state.word]!;
    const { options: orbs, correctLane } = orbsFor(answer, pool, state.lanes, rng);
    state.rounds += 1;
    const round: Round = {
      id: `r${state.rounds}`,
      sentence: state.sentence,
      wordIndex: state.word,
      options: orbs,
      correctLane,
      orbsAt,
      chosen: null,
      retry,
    };
    state.round = round;
    state.waiting = false;
    events.push({
      type: 'roundStarted',
      roundId: round.id,
      sentence: round.sentence,
      wordIndex: round.wordIndex,
      options: orbs.map((o) => ({ ...o })),
      orbsAt,
      retry,
    });
  };

  /** The wizard passed the orbs: the next word, the next sentence, or the portal. */
  const endRound = (round: Round, events: SpellweaversEvent[]): void => {
    const sentence = sentences[state.sentence]!;
    if (state.word < sentence.words.length) {
      startRound(round.orbsAt + TUNING.orbSpacing, false, events);
      return;
    }
    if (state.sentence + 1 < sentences.length) {
      state.sentence += 1;
      state.word = 0;
      startRound(round.orbsAt + TUNING.orbSpacing, false, events);
      return;
    }
    state.round = null;
    state.phase = 'finale';
    state.portalAt = round.orbsAt + TUNING.portalDistance;
    events.push({ type: 'portalAppeared', at: state.portalAt });
  };

  // ------------------------------------------------------------ commands

  const choose = (lane: number): SpellweaversEvent[] => {
    const events: SpellweaversEvent[] = [];
    const round = state.round;
    if (!round || round.chosen !== null || state.restMs > 0) return events;
    if (!Number.isInteger(lane) || lane < 0 || lane >= round.options.length) return events;
    const sentence = sentences[round.sentence]!;
    const correct = lane === round.correctLane;
    round.chosen = lane;
    sentence.started = true;
    state.waiting = false;
    events.push({ type: 'laneChosen', roundId: round.id, lane, correct, correctLane: round.correctLane });
    if (correct) {
      state.word += 1;
      state.collected += 1;
      state.score += round.retry ? TUNING.retryWordScore : TUNING.wordScore;
      state.boostUntilMs = state.timeMs + TUNING.boostMs;
      state.speed = TUNING.boostSpeed;
      events.push({ type: 'wordCollected', sentence: round.sentence, wordIndex: round.wordIndex, text: sentence.words[round.wordIndex]! });
      if (state.word === sentence.words.length) {
        sentence.cleared = true;
        state.score += TUNING.sentenceScore;
        events.push({ type: 'sentenceCast', sentence: round.sentence, id: sentence.id });
      }
    } else {
      sentence.misses += 1;
      state.speed = 0;
      state.courage -= 1;
      events.push({ type: 'courageLost', courage: state.courage });
      state.restMs = state.courage <= 0 ? TUNING.restEmptyMs : TUNING.restMs;
    }
    return events;
  };

  // ------------------------------------------------------------ the run

  const speedNow = (): number => (state.timeMs < state.boostUntilMs ? TUNING.boostSpeed : TUNING.cruiseSpeed);

  const tickRunning = (events: SpellweaversEvent[]): void => {
    if (state.round === null) startRound(state.distance + TUNING.orbSpacing, false, events);
    const round = state.round!;
    if (state.restMs > 0) {
      state.speed = 0;
      state.restMs = Math.max(0, state.restMs - STEP_MS);
      if (state.restMs === 0) {
        if (state.courage <= 0) {
          state.courage = TUNING.courage;
          events.push({ type: 'rested', courage: state.courage });
        }
        // The same word returns with new decoys, where the wizard stands.
        startRound(round.orbsAt, true, events);
      }
      return;
    }
    if (round.chosen === null) {
      const hoverAt = round.orbsAt - TUNING.hoverBefore;
      const ahead = state.distance + speedNow() * STEP_S;
      if (ahead >= hoverAt) {
        state.distance = Math.max(state.distance, hoverAt);
        state.speed = 0;
        if (!state.waiting) {
          state.waiting = true;
          events.push({ type: 'waiting', roundId: round.id });
        }
      } else {
        state.speed = speedNow();
        state.distance = ahead;
      }
      return;
    }
    state.speed = speedNow();
    state.distance += state.speed * STEP_S;
    if (state.distance >= round.orbsAt) endRound(round, events);
  };

  const tickFinale = (events: SpellweaversEvent[]): void => {
    const portalAt = state.portalAt!;
    if (state.distance < portalAt) {
      state.speed = speedNow();
      state.distance = Math.min(portalAt, state.distance + state.speed * STEP_S);
      if (state.distance >= portalAt) {
        state.speed = 0;
        state.completeAtMs = state.timeMs + TUNING.portalHoldMs;
      }
      return;
    }
    state.speed = 0;
    if (state.timeMs < state.completeAtMs) return;
    state.phase = 'complete';
    events.push({ type: 'runComplete', score: state.score });
  };

  // ------------------------------------------------------------ the simulation

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'running') return [];
      switch (command.type) {
        case 'choose':
          return choose(command.lane);
        default:
          return [];
      }
    },
    tick() {
      if (state.phase === 'complete') return [];
      const events: SpellweaversEvent[] = [];
      state.timeMs += STEP_MS;
      if (state.phase === 'running') tickRunning(events);
      else tickFinale(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
