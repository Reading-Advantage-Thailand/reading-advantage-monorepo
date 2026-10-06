/**
 * The Griffin Riders Escape simulation: a real-time `Simulation` on the fixed step. The riders
 * flee on a griffin over the land. Ahead, rows of word gates (three lanes) and storms (bat swarms
 * in one or two lanes) come in turn. The student steers the griffin between the lanes: the gate
 * with the next word of the sentence adds the word, a storm costs courage. A wrong gate costs
 * courage too; the riders rest and the same word comes back with new gates (at 0 courage the rest
 * is longer and all courage returns). No timer decides a result and there is no game over: a
 * missed wave only repeats.
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { LANES, escapeOf, gatesFor, laneX, nearestLane, stormLanesFor, wordPoolOf, type EscapeInput } from './content.js';
import type { EscapeCommand, EscapeEvent, EscapeState, Wave } from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  /** The most sentences in one escape. */
  maxSentences: 4,
  /** Speed along the path in meters per second, and in Helper mode. */
  speed: 6,
  speedHelper: 4.5,
  /** Distance from the griffin to a new gate row, in meters, and from a storm to its gate row. */
  gateLead: 34,
  stormLead: 26,
  stormToGates: 26,
  /** Chance of a storm before a new word (never before a repeated word), and in Helper mode. */
  stormChance: 0.5,
  stormChanceHelper: 0.2,
  /** Lanes a storm fills, and in Helper mode. */
  stormLanes: 2,
  stormLanesHelper: 1,
  /** How fast the griffin changes lane, in meters per second. */
  laneSpeed: 14,
  /** Rest after a setback, and after the last courage is gone. */
  restMs: 1500,
  restEmptyMs: 2600,
  /** Courage at the start and after a rest. */
  courage: 3,
  /** Score: a word on the first try, a word after a wrong gate, a sentence done. */
  wordScore: 10,
  retryWordScore: 5,
  sentenceScore: 50,
  /** The closing flight after the last sentence. */
  finaleMs: 2600,
} as const;

export interface EscapeOptions {
  seed: number;
  helper: boolean;
}

export type EscapeSimulation = Simulation<EscapeState, EscapeCommand, EscapeEvent>;

/** The nearest wave ahead, or null. */
export function nextWaveOf(state: EscapeState): Wave | null {
  return state.waves[0] ?? null;
}

/** The lane with the next word in the nearest row of gates ahead, or null when no gate row is ahead. */
export function rightLaneOf(state: EscapeState): number | null {
  const wave = state.waves.find((w) => w.kind === 'gates');
  return wave ? wave.rightLane : null;
}

const STEP_S = STEP_MS / 1000;

export function createGriffinRidersEscape(input: EscapeInput, options: EscapeOptions): EscapeSimulation {
  const rng: Rng = createRng(options.seed);
  const sentences = escapeOf(input, rng, TUNING.maxSentences);
  const pool = wordPoolOf(input);
  const middle = Math.floor(LANES.count / 2);

  const state: EscapeState = {
    phase: 'flight',
    helper: options.helper,
    laneCount: LANES.count,
    timeMs: 0,
    distance: 0,
    speed: options.helper ? TUNING.speedHelper : TUNING.speed,
    restMs: 0,
    finaleMs: 0,
    courage: TUNING.courage,
    score: 0,
    griffin: { x: laneX(middle), lane: middle },
    sentences,
    sentence: 0,
    word: 0,
    waves: [],
    made: 0,
    retryNext: false,
    collected: 0,
    bumps: 0,
  };
  // An escape with no sentences is over before it starts (the manifest needs 3 sentences).
  if (sentences.length === 0) state.phase = 'complete';
  const cruise = state.speed;

  // ------------------------------------------------------------ waves

  const makeWave = (kind: Wave['kind'], z: number, retry: boolean, events: EscapeEvent[]): void => {
    const sentence = sentences[state.sentence]!;
    const answer = sentence.words[state.word]!;
    state.made += 1;
    const wave: Wave = { id: `w${state.made}`, kind, z, sentence: state.sentence, wordIndex: state.word, gates: [], rightLane: -1, stormLanes: [], retry };
    if (kind === 'gates') {
      const row = gatesFor(answer, pool, rng);
      wave.gates = row.gates;
      wave.rightLane = row.rightLane;
    } else {
      wave.stormLanes = stormLanesFor(state.helper ? TUNING.stormLanesHelper : TUNING.stormLanes, rng);
    }
    state.waves.push(wave);
    events.push({
      type: 'waveMade',
      waveId: wave.id,
      kind,
      z,
      sentence: wave.sentence,
      wordIndex: wave.wordIndex,
      gates: wave.gates.map((g) => ({ ...g })),
      stormLanes: wave.stormLanes.slice(),
      retry,
    });
  };

  /** Opens what comes next for the word at hand: maybe a storm, then the gate row. */
  const makeNext = (events: EscapeEvent[]): void => {
    const retry = state.retryNext;
    state.retryNext = false;
    const chance = state.helper ? TUNING.stormChanceHelper : TUNING.stormChance;
    if (!retry && state.made > 0 && rng.next() < chance) {
      makeWave('storm', state.distance + TUNING.stormLead, false, events);
      makeWave('gates', state.distance + TUNING.stormLead + TUNING.stormToGates, false, events);
      return;
    }
    makeWave('gates', state.distance + TUNING.gateLead, retry, events);
  };

  // ------------------------------------------------------------ commands

  const goToLane = (lane: number): EscapeEvent[] => {
    if (!Number.isInteger(lane) || lane < 0 || lane >= LANES.count || lane === state.griffin.lane) return [];
    state.griffin.lane = lane;
    return [{ type: 'laneChanged', lane }];
  };

  // ------------------------------------------------------------ setbacks

  /** A setback: the riders rest; at 0 courage the rest is longer. */
  const setback = (cause: 'gate' | 'storm', events: EscapeEvent[]): void => {
    state.courage -= 1;
    events.push({ type: 'courageLost', courage: state.courage, cause });
    state.restMs = state.courage <= 0 ? TUNING.restEmptyMs : TUNING.restMs;
    state.speed = 0;
  };

  // ------------------------------------------------------------ waves met

  const passGates = (wave: Wave, events: EscapeEvent[]): void => {
    const lane = nearestLane(state.griffin.x);
    const sentence = sentences[wave.sentence]!;
    const gate = wave.gates.find((g) => g.lane === lane);
    const correct = lane === wave.rightLane;
    sentence.started = true;
    events.push({ type: 'gatePassed', waveId: wave.id, lane, correct, rightLane: wave.rightLane, text: gate?.text ?? '' });
    if (!correct) {
      sentence.misses += 1;
      state.retryNext = true;
      setback('gate', events);
      return;
    }
    state.word += 1;
    state.collected += 1;
    state.score += wave.retry ? TUNING.retryWordScore : TUNING.wordScore;
    events.push({ type: 'wordCollected', sentence: wave.sentence, wordIndex: wave.wordIndex, text: gate!.text });
    if (state.word < sentence.words.length) return;
    sentence.cleared = true;
    state.score += TUNING.sentenceScore;
    events.push({ type: 'sentenceCast', sentence: wave.sentence, id: sentence.id });
    if (state.sentence + 1 < sentences.length) {
      state.sentence += 1;
      state.word = 0;
    } else {
      state.phase = 'finale';
      state.finaleMs = TUNING.finaleMs;
    }
  };

  const passStorm = (wave: Wave, events: EscapeEvent[]): void => {
    const lane = nearestLane(state.griffin.x);
    if (wave.stormLanes.includes(lane)) {
      state.bumps += 1;
      events.push({ type: 'stormHit', waveId: wave.id, lane });
      setback('storm', events);
    } else {
      events.push({ type: 'stormDodged', waveId: wave.id });
    }
  };

  // ------------------------------------------------------------ the flight

  const moveGriffin = (): void => {
    const g = state.griffin;
    const to = laneX(g.lane);
    const step = TUNING.laneSpeed * STEP_S;
    g.x = Math.abs(to - g.x) <= step ? to : g.x + Math.sign(to - g.x) * step;
  };

  const tickFlight = (events: EscapeEvent[]): void => {
    moveGriffin();
    if (state.restMs > 0) {
      state.restMs = Math.max(0, state.restMs - STEP_MS);
      if (state.restMs === 0) {
        if (state.courage <= 0) {
          state.courage = TUNING.courage;
          events.push({ type: 'rested', courage: state.courage });
        }
        state.speed = cruise;
      }
      return;
    }
    if (state.waves.length === 0) makeNext(events);
    state.distance += state.speed * STEP_S;
    while (state.waves.length > 0 && state.waves[0]!.z <= state.distance && state.phase === 'flight' && state.restMs === 0) {
      const wave = state.waves.shift()!;
      if (wave.kind === 'gates') passGates(wave, events);
      else passStorm(wave, events);
    }
  };

  const tickFinale = (events: EscapeEvent[]): void => {
    moveGriffin();
    state.distance += state.speed * STEP_S;
    state.finaleMs = Math.max(0, state.finaleMs - STEP_MS);
    if (state.finaleMs > 0) return;
    state.phase = 'complete';
    state.speed = 0;
    events.push({ type: 'escapeComplete', score: state.score });
  };

  // ------------------------------------------------------------ the simulation

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'flight') return [];
      switch (command.type) {
        case 'lane':
          return goToLane(command.lane);
        case 'steer':
          return goToLane(Math.min(LANES.count - 1, Math.max(0, state.griffin.lane + (command.dir < 0 ? -1 : 1))));
        default:
          return [];
      }
    },
    tick() {
      if (state.phase === 'complete') return [];
      const events: EscapeEvent[] = [];
      state.timeMs += STEP_MS;
      if (state.phase === 'flight') tickFlight(events);
      else tickFinale(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
