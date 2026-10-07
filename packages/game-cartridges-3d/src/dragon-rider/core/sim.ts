/**
 * The Dragon Rider 3D simulation: a real-time `Simulation` on the fixed step. Legacy rules kept:
 * a term, two gates (left and right) with the meaning and a decoy, a right gate adds a dragon, a
 * wrong gate sends one home (never below 1), and the dark dragon's power is max(3, ceil(choices
 * / 2)). Rules changed (owner decisions): every story word once plus a missed word once more, no
 * timer, the gates hold in front of the rider until the choice, and the duel always ends in a
 * win: dragons tire one by one, rest, and rally, so a small flock only fights longer.
 *
 * Answer audio (Read to Select Audio, `options.answerAudio`): every input word is one round (at
 * most `MAX_LISTENING_SESSION_ITEMS`). The banner shows the meaning and the gates play the English
 * words: `choose` only steers to a gate (`gateHeld`), the rider holds at it (`gateReached`), and
 * the view resolves it with `commit` after its clip played to the end. A missed word still comes
 * back once: its question was not completed.
 */
import { MAX_LISTENING_SESSION_ITEMS } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { rideWordsOf, gatesFor, type DragonRiderInput } from './content.js';
import type { DragonRiderCommand, DragonRiderEvent, DragonRiderState, RideWord, Round } from './types.js';

export const TUNING = {
  /** The most words in one ride. */
  maxWords: 8,
  /** Gates per round. */
  gates: 2,
  /** Speed of the gates toward the rider, and after a choice, in meters per second. */
  approachSpeed: 8,
  passSpeed: 16,
  /** Where new gates appear, and where they hold with no choice, in meters. */
  spawnGap: 40,
  holdGap: 7,
  /** Coins per word right on the first try, and per dragon that stands at the end. */
  coinsPerFirstTry: 5,
  coinsPerDragon: 10,
  /** Time from the end of the last round to the first exchange. */
  bossArriveMs: 2800,
  /** Time between exchanges, and from the last exchange to the dark dragon's fall. */
  exchangeMs: 1100,
  bossFallMs: 2000,
  /** The dark dragon's least power. */
  minPower: 3,
} as const;

export interface DragonRiderOptions {
  seed: number;
  /** Read to Select Audio (the host gave an answer audio controller). */
  answerAudio?: boolean;
}

export type DragonRiderSimulation = Simulation<DragonRiderState, DragonRiderCommand, DragonRiderEvent>;

/** The dark dragon's power for a number of gate choices (the legacy formula). */
export function bossPowerOf(choices: number): number {
  return Math.max(TUNING.minPower, Math.ceil(choices * 0.5));
}

/** The gate of the current round that carries the word's meaning, or null without an open round. */
export function correctGateOf(state: DragonRiderState): number | null {
  const round = state.round;
  if (!round) return null;
  const gate = round.options.findIndex((o) => o.id === round.itemId);
  return gate === -1 ? null : gate;
}

const STEP_S = STEP_MS / 1000;

export function createDragonRider(input: DragonRiderInput, options: DragonRiderOptions): DragonRiderSimulation {
  const rng: Rng = createRng(options.seed);
  const answerAudio = options.answerAudio === true;
  const words = rideWordsOf(input, rng, answerAudio ? MAX_LISTENING_SESSION_ITEMS : TUNING.maxWords);

  const state: DragonRiderState = {
    phase: 'riding',
    answerAudio,
    timeMs: 0,
    distance: 0,
    waiting: false,
    flock: 1,
    coins: 0,
    words,
    queue: words.map((w) => w.id),
    round: null,
    roundIndex: 0,
    total: words.length,
    choices: 0,
    bossPower: 0,
    bossHp: 0,
    active: 1,
    rallies: 0,
    nextBeatMs: 0,
  };
  if (words.length === 0) state.phase = 'complete';

  let started = 0;
  const wordById = (id: string): RideWord => {
    const word = state.words.find((w) => w.id === id);
    if (!word) throw new Error(`dragon rider: unknown word ${id}`);
    return word;
  };

  const startRound = (events: DragonRiderEvent[]): void => {
    const word = wordById(state.queue.shift()!);
    const { options: gateOptions } = gatesFor(word, state.words, TUNING.gates, rng, answerAudio);
    started += 1;
    const round: Round = {
      id: `r${started}`,
      itemId: word.id,
      term: word.term,
      translation: word.translation,
      position: word.position,
      options: gateOptions,
      gap: TUNING.spawnGap,
      chosen: null,
      correctGate: null,
      held: null,
    };
    state.round = round;
    state.roundIndex = started - 1;
    events.push({
      type: 'roundStarted',
      roundId: round.id,
      itemId: round.itemId,
      term: round.term,
      translation: round.translation,
      position: round.position,
      options: round.options.map((o) => ({ ...o })),
    });
  };

  const endRound = (events: DragonRiderEvent[]): void => {
    state.round = null;
    if (state.queue.length > 0) {
      startRound(events);
      return;
    }
    state.phase = 'duel';
    state.bossPower = bossPowerOf(state.choices);
    state.bossHp = state.bossPower;
    state.active = state.flock;
    state.nextBeatMs = state.timeMs + TUNING.bossArriveMs;
    events.push({ type: 'bossAppeared', flock: state.flock, power: state.bossPower });
  };

  /** True for a gate the student may still pick in the current round. */
  const open = (round: Round | null, gate: number): round is Round =>
    !!round && round.chosen === null && Number.isInteger(gate) && gate >= 0 && gate < round.options.length;

  /** Answer audio: steer to a gate; at the gates, the rider holds at it for the view's commit. */
  const hold = (gate: number): DragonRiderEvent[] => {
    const round = state.round;
    if (!open(round, gate)) return [];
    const events: DragonRiderEvent[] = [];
    if (round.held !== gate) {
      round.held = gate;
      events.push({ type: 'gateHeld', roundId: round.id, gate });
    }
    // At the gates, every choice asks the view to play the gate's clip again (a retry after a failure).
    if (state.waiting) events.push({ type: 'gateReached', roundId: round.id, gate });
    return events;
  };

  /** Answer audio: the view confirmed the clip of the gate the rider holds at. */
  const commit = (): DragonRiderEvent[] => {
    const round = state.round;
    if (!answerAudio || !round || round.held === null || !state.waiting) return [];
    return choose(round.held);
  };

  const choose = (gate: number): DragonRiderEvent[] => {
    const events: DragonRiderEvent[] = [];
    const round = state.round;
    if (!open(round, gate)) return events;
    const correctGate = correctGateOf(state)!;
    const correct = gate === correctGate;
    const word = wordById(round.itemId);
    round.chosen = gate;
    round.correctGate = correctGate;
    word.attempts += 1;
    state.choices += 1;
    state.waiting = false;
    events.push({ type: 'gateChosen', roundId: round.id, gate, correct, correctGate });
    if (correct) {
      word.solved = true;
      if (word.attempts === 1) state.coins += TUNING.coinsPerFirstTry;
      state.flock += 1;
      events.push({ type: 'flockGrew', count: state.flock });
    } else {
      if (state.flock > 1) {
        state.flock -= 1;
        events.push({ type: 'flockShrank', count: state.flock });
      }
      if (!word.returned) {
        word.returned = true;
        state.queue.push(word.id);
        state.total += 1;
        events.push({ type: 'wordReturns', itemId: word.id });
      }
    }
    return events;
  };

  const tickRiding = (events: DragonRiderEvent[]): void => {
    if (state.round === null) startRound(events);
    const round = state.round!;
    if (round.chosen === null) {
      const next = round.gap - TUNING.approachSpeed * STEP_S;
      if (next <= TUNING.holdGap) {
        round.gap = Math.min(round.gap, TUNING.holdGap);
        if (!state.waiting) {
          state.waiting = true;
          if (answerAudio && round.held !== null) events.push({ type: 'gateReached', roundId: round.id, gate: round.held });
          else events.push({ type: 'waiting', roundId: round.id });
        }
      } else {
        round.gap = next;
        state.distance += TUNING.approachSpeed * STEP_S;
      }
      return;
    }
    round.gap -= TUNING.passSpeed * STEP_S;
    state.distance += TUNING.passSpeed * STEP_S;
    if (round.gap <= 0) endRound(events);
  };

  const tickDuel = (events: DragonRiderEvent[]): void => {
    if (state.timeMs < state.nextBeatMs) return;
    if (state.bossHp > 0) {
      state.bossHp -= 1;
      if (state.bossHp > 0) {
        if (state.active > 1) state.active -= 1;
        else if (state.flock > 1) {
          state.active = state.flock;
          state.rallies += 1;
          events.push({ type: 'exchange', bossHp: state.bossHp, active: state.active });
          events.push({ type: 'rally', active: state.active });
          state.nextBeatMs = state.timeMs + TUNING.exchangeMs;
          return;
        }
      }
      events.push({ type: 'exchange', bossHp: state.bossHp, active: state.active });
      state.nextBeatMs = state.timeMs + (state.bossHp > 0 ? TUNING.exchangeMs : TUNING.bossFallMs);
      return;
    }
    state.coins += TUNING.coinsPerDragon * state.flock;
    state.phase = 'complete';
    events.push({ type: 'rideComplete', flock: state.flock, coins: state.coins });
  };

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'riding') return [];
      if (command.type === 'commit') return commit();
      return answerAudio ? hold(command.gate) : choose(command.gate);
    },
    tick() {
      if (state.phase === 'complete') return [];
      const events: DragonRiderEvent[] = [];
      state.timeMs += STEP_MS;
      if (state.phase === 'riding') tickRiding(events);
      else tickDuel(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
