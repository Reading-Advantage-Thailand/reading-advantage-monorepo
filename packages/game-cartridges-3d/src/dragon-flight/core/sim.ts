/**
 * The Dragon Flight 3D simulation: a real-time `Simulation` on the fixed step. Rules from
 * sections 2, 3, and 6 of docs/game-dragon-flight-3d.md: every story word once, gates ahead with
 * the meaning and decoys, a right gate grows the flock and boosts the speed, a wrong gate sends
 * one dragon home (never below 1) and queues the word once more, no choice makes the dragon hover
 * before the gates, and after the last gates the flock burns the boss with one fireball per
 * dragon. There is no game over: the boss always falls.
 *
 * Answer audio (Read to Select Audio, `options.answerAudio`): every input word is one round (at
 * most `MAX_LISTENING_SESSION_ITEMS`) with two gates. The banner shows the meaning and the gates
 * play the English words: `choose` only steers to a gate (`gateHeld`), the dragon waits at it
 * (`gateReached`), and the view resolves it with `commit` after its clip played to the end. A
 * missed word still comes back once: its question was not completed.
 */
import { MAX_LISTENING_SESSION_ITEMS } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { flightWordsOf, gatesFor, type DragonFlightInput } from './content.js';
import type {
  DragonFlightCommand,
  DragonFlightEvent,
  DragonFlightState,
  FlightWord,
  Round,
} from './types.js';

/** Every tuning number of the game (section 6 of the design). */
export const TUNING = {
  /** The most words in one flight. */
  maxWords: 10,
  /** Gates per round, and in Helper mode. */
  gates: 3,
  gatesHelper: 2,
  /** Answer audio: two gates, as in the old game (each clip takes time to hear). */
  gatesAudio: 2,
  /** Speeds in meters per second; the boost lasts `boostMs` after a right gate. */
  cruiseSpeed: 9,
  boostSpeed: 14,
  boostMs: 1200,
  /** Distance between one round's gates and the next, in meters (about 6 s of reading). */
  gateSpacing: 60,
  /** The dragon hovers this far before gates with no choice, in meters. */
  hoverBefore: 8,
  /** Coins per dragon at the boss (paid per fireball) and per word right on the first try. */
  coinsPerDragon: 10,
  coinsPerFirstTry: 5,
  /** The boss hill is this far past the last gates, in meters. */
  bossDistance: 40,
  /** The first fireball comes this long after the dragon reaches the boss; the rest follow. */
  fireballFirstMs: 1500,
  fireballEveryMs: 700,
  /** The boss falls this long after the last fireball, and the flight is complete. */
  bossFallMs: 2000,
} as const;

export interface DragonFlightOptions {
  seed: number;
  helper: boolean;
  /** Read to Select Audio (the host gave an answer audio controller). */
  answerAudio?: boolean;
}

export type DragonFlightSimulation = Simulation<DragonFlightState, DragonFlightCommand, DragonFlightEvent>;

/** Gates per round for a mode. */
export function gateCountFor(helper: boolean): number {
  return helper ? TUNING.gatesHelper : TUNING.gates;
}

/** The gate of the current round that carries the word's meaning, or null without an open round. */
export function correctGateOf(state: DragonFlightState): number | null {
  const round = state.round;
  if (!round) return null;
  const gate = round.options.findIndex((o) => o.id === round.itemId);
  return gate === -1 ? null : gate;
}

const wordById = (state: DragonFlightState, id: string): FlightWord => {
  const word = state.words.find((w) => w.id === id);
  if (!word) throw new Error(`dragon flight: unknown word ${id}`);
  return word;
};

const STEP_S = STEP_MS / 1000;

export function createDragonFlight(input: DragonFlightInput, options: DragonFlightOptions): DragonFlightSimulation {
  const rng: Rng = createRng(options.seed);
  const answerAudio = options.answerAudio === true;
  const words = flightWordsOf(input, rng, answerAudio ? MAX_LISTENING_SESSION_ITEMS : TUNING.maxWords);

  const state: DragonFlightState = {
    phase: 'flying',
    helper: options.helper,
    answerAudio,
    gates: answerAudio ? TUNING.gatesAudio : gateCountFor(options.helper),
    timeMs: 0,
    distance: 0,
    speed: TUNING.cruiseSpeed,
    waiting: false,
    flock: 1,
    coins: 0,
    words,
    queue: words.map((w) => w.id),
    round: null,
    roundIndex: 0,
    total: words.length,
    boostUntilMs: 0,
    bossAt: null,
    fireballs: 0,
    nextFireballMs: 0,
  };
  // A flight with no words is over before it starts (the manifest needs 4 words).
  if (words.length === 0) state.phase = 'complete';

  let started = 0;

  // ------------------------------------------------------------ rounds

  /** Starts the next round of the queue with its gates `gatesAt` ahead. */
  const startRound = (gatesAt: number, events: DragonFlightEvent[]): void => {
    const word = wordById(state, state.queue.shift()!);
    const { options: gateOptions } = gatesFor(word, state.words, state.gates, rng, answerAudio);
    started += 1;
    const round: Round = {
      id: `r${started}`,
      itemId: word.id,
      term: word.term,
      translation: word.translation,
      position: word.position,
      options: gateOptions,
      gatesAt,
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
      gatesAt,
    });
  };

  /** The dragon passed the gates: the next round, or the boss after the last one. */
  const endRound = (round: Round, events: DragonFlightEvent[]): void => {
    if (state.queue.length > 0) {
      startRound(round.gatesAt + TUNING.gateSpacing, events);
      return;
    }
    state.round = null;
    state.phase = 'boss';
    state.bossAt = round.gatesAt + TUNING.bossDistance;
    events.push({ type: 'bossAppeared', flock: state.flock });
  };

  // ------------------------------------------------------------ commands

  /** True for a gate the student may still pick in the current round. */
  const open = (round: Round | null, gate: number): round is Round =>
    !!round && round.chosen === null && Number.isInteger(gate) && gate >= 0 && gate < round.options.length;

  /** Answer audio: steer to a gate; at the gates, the dragon waits at it for the view's commit. */
  const hold = (gate: number): DragonFlightEvent[] => {
    const round = state.round;
    if (!open(round, gate)) return [];
    const events: DragonFlightEvent[] = [];
    if (round.held !== gate) {
      round.held = gate;
      events.push({ type: 'gateHeld', roundId: round.id, gate });
    }
    // At the gates, every choice asks the view to play the gate's clip again (a retry after a failure).
    if (state.waiting) events.push({ type: 'gateReached', roundId: round.id, gate });
    return events;
  };

  /** Answer audio: the view confirmed the clip of the gate the dragon waits at. */
  const commit = (): DragonFlightEvent[] => {
    const round = state.round;
    if (!answerAudio || !round || round.held === null || !state.waiting) return [];
    return choose(round.held);
  };

  const choose = (gate: number): DragonFlightEvent[] => {
    const events: DragonFlightEvent[] = [];
    const round = state.round;
    if (!open(round, gate)) return events;
    const correctGate = correctGateOf(state)!;
    const correct = gate === correctGate;
    const word = wordById(state, round.itemId);
    round.chosen = gate;
    round.correctGate = correctGate;
    word.attempts += 1;
    state.waiting = false;
    events.push({ type: 'gateChosen', roundId: round.id, gate, correct, correctGate });
    if (correct) {
      word.solved = true;
      if (word.attempts === 1) state.coins += TUNING.coinsPerFirstTry;
      state.flock += 1;
      state.boostUntilMs = state.timeMs + TUNING.boostMs;
      state.speed = TUNING.boostSpeed;
      events.push({ type: 'flockGrew', count: state.flock });
    } else {
      state.speed = TUNING.cruiseSpeed;
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

  // ------------------------------------------------------------ the flight

  const speedNow = (): number => (state.timeMs < state.boostUntilMs ? TUNING.boostSpeed : TUNING.cruiseSpeed);

  const tickFlying = (events: DragonFlightEvent[]): void => {
    if (state.round === null) {
      startRound(state.distance + TUNING.gateSpacing, events);
    }
    const round = state.round!;
    if (round.chosen === null) {
      const hoverAt = round.gatesAt - TUNING.hoverBefore;
      const ahead = state.distance + speedNow() * STEP_S;
      if (ahead >= hoverAt) {
        state.distance = hoverAt;
        state.speed = 0;
        if (!state.waiting) {
          state.waiting = true;
          if (answerAudio && round.held !== null) events.push({ type: 'gateReached', roundId: round.id, gate: round.held });
          else events.push({ type: 'waiting', roundId: round.id });
        }
      } else {
        state.speed = speedNow();
        state.distance = ahead;
      }
      return;
    }
    state.speed = speedNow();
    state.distance += state.speed * STEP_S;
    if (state.distance >= round.gatesAt) endRound(round, events);
  };

  const tickBoss = (events: DragonFlightEvent[]): void => {
    const bossAt = state.bossAt!;
    if (state.distance < bossAt) {
      state.speed = speedNow();
      state.distance = Math.min(bossAt, state.distance + state.speed * STEP_S);
      if (state.distance >= bossAt) {
        state.speed = 0;
        state.nextFireballMs = state.timeMs + TUNING.fireballFirstMs;
      }
      return;
    }
    state.speed = 0;
    if (state.timeMs < state.nextFireballMs) return;
    if (state.fireballs < state.flock) {
      state.fireballs += 1;
      state.coins += TUNING.coinsPerDragon;
      events.push({ type: 'fireball', index: state.fireballs - 1 });
      state.nextFireballMs =
        state.timeMs + (state.fireballs < state.flock ? TUNING.fireballEveryMs : TUNING.bossFallMs);
      return;
    }
    state.phase = 'complete';
    events.push({ type: 'flightComplete', flock: state.flock, coins: state.coins });
  };

  // ------------------------------------------------------------ the simulation

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'flying') return [];
      switch (command.type) {
        case 'choose':
          return answerAudio ? hold(command.gate) : choose(command.gate);
        case 'commit':
          return commit();
        default:
          return [];
      }
    },
    tick() {
      if (state.phase === 'complete') return [];
      const events: DragonFlightEvent[] = [];
      state.timeMs += STEP_MS;
      if (state.phase === 'flying') tickFlying(events);
      else tickBoss(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
