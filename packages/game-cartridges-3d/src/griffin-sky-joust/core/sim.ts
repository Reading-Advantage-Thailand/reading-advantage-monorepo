/**
 * The Griffin Sky-Joust simulation: a real-time `Simulation` on the fixed step. The rules of the
 * legacy game (packages/game-cartridges/src/griffin-sky-joust.ts): each word of a sentence rides
 * a rider that flies sideways; the griffin flaps, drifts, and falls under gravity; a strike from
 * above on the rider with the next word of the sentence takes the word; any other bump hurts.
 * What changed (owner rules): a bump costs courage, and at 0 courage the griffin rests and comes
 * back with all of it. There is no game over and no timer decides anything. A sentence has at
 * most 8 riders in the air; the words of a sentence are struck in order, and a repeated word
 * ("the ... the") counts for either rider that carries it.
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { joustOf, normWord, type JoustInput } from './content.js';
import type { Griffin, JoustCommand, JoustEvent, JoustState, Rider } from './types.js';

/** The arena in pixels (y down); the views scale it. */
export const ARENA = { width: 960, height: 540 } as const;

/** Every tuning number of the game. */
export const TUNING = {
  /** The most sentences in one game. */
  maxSentences: 4,
  /** The most riders in the air at once. */
  maxRiders: 8,
  courage: 3,
  /** The rest after the courage ran out, in ms. */
  restMs: 2000,
  /** A bump leaves the griffin safe for this long, in ms. */
  safeMs: 1500,
  /** The beat before a sentence starts and between two sentences, in ms. */
  pauseMs: 900,
  /** Points per word and for a sentence with no wrong strike. */
  pointsPerWord: 100,
  pointsPerCleanSentence: 50,
  // Physics, from the legacy game (pixels and seconds).
  gravity: 800,
  flapImpulse: -350,
  driftSpeed: 180,
  maxVx: 280,
  damping: 0.98,
  maxVy: 600,
  griffinRadius: 24,
  riderRadius: 28,
  riderSpeed: 90,
  /** Helper mode: slower riders. */
  riderSpeedHelper: 60,
  knockbackX: 200,
  knockbackY: -220,
  /** The little hop after a good strike. */
  strikeHop: -260,
  topMargin: 64,
  bottomMargin: 32,
  /** Where riders fly: the band of heights. */
  riderTop: 160,
  riderSpan: 180,
  startY: ARENA.height - 120,
} as const;

export interface JoustOptions {
  seed: number;
  helper: boolean;
}

export type JoustSimulation = Simulation<JoustState, JoustCommand, JoustEvent>;

const STEP_S = STEP_MS / 1000;
/** Damping is per 16.67 ms frame in the legacy game. */
const DAMP = Math.pow(TUNING.damping, STEP_MS / 16.67);

/** Rider speed for a mode, in pixels per second. */
export function riderSpeedFor(helper: boolean): number {
  return helper ? TUNING.riderSpeedHelper : TUNING.riderSpeed;
}

/** The word the griffin must strike now, or null when no sentence is open. */
export function targetWordOf(state: JoustState): string | null {
  if (state.riders.length === 0) return null;
  return state.sentences[state.sentence]?.words[state.word] ?? null;
}

/** True when `rider` carries the word the griffin must strike now. */
export function isTarget(state: JoustState, rider: Pick<Rider, 'text'>): boolean {
  const word = targetWordOf(state);
  return word !== null && normWord(word) === normWord(rider.text);
}

const startGriffin = (): Griffin => ({ x: ARENA.width / 2, y: TUNING.startY, vx: 0, vy: 0, safeMs: 0, radius: TUNING.griffinRadius });

export function createGriffinSkyJoust(input: JoustInput, options: JoustOptions): JoustSimulation {
  const rng: Rng = createRng(options.seed);
  const sentences = joustOf(input, rng, TUNING.maxSentences);
  return build(initialState(sentences, options.helper), rng);
}

/**
 * A simulation that continues from a copy of `from` with a fresh rng of `seed` (the bot's
 * look-ahead uses it; the copy never touches the original).
 */
export function resumeGriffinSkyJoust(from: JoustState, seed: number): JoustSimulation {
  return build(structuredClone(from), createRng(seed));
}

function initialState(sentences: JoustState['sentences'], helper: boolean): JoustState {
  const state: JoustState = {
    phase: 'playing',
    helper,
    timeMs: 0,
    griffin: startGriffin(),
    riders: [],
    sentences,
    sentence: 0,
    word: 0,
    courage: TUNING.courage,
    restMs: 0,
    pauseMs: TUNING.pauseMs,
    score: 0,
    spawned: 0,
  };
  // A game with no sentences is over before it starts (the manifest needs 3 sentences).
  if (sentences.length === 0) state.phase = 'complete';
  return state;
}

function build(state: JoustState, rng: Rng): JoustSimulation {
  const speed = riderSpeedFor(state.helper);

  // ------------------------------------------------------------ riders

  const spawn = (text: string, startX: number): Rider => {
    let x = startX;
    state.spawned += 1;
    const y = TUNING.riderTop + rng.next() * TUNING.riderSpan;
    let vx = rng.next() > 0.5 ? speed : -speed;
    // A new rider never appears on top of the griffin: it starts a safe distance to the side.
    const g = state.griffin;
    const clear = TUNING.griffinRadius + TUNING.riderRadius + 80;
    if (Math.hypot(g.x - x, g.y - y) < clear) {
      const side = g.x < ARENA.width / 2 ? 1 : -1;
      x = Math.max(TUNING.riderRadius, Math.min(ARENA.width - TUNING.riderRadius, g.x + side * (clear + rng.next() * 120)));
    }
    // Two riders never fly in lockstep (the same place at the same speed): one turns the other way.
    if (state.riders.some((o) => Math.abs(o.x - x) < 40 && Math.sign(o.vx) === Math.sign(vx))) vx = -vx;
    return { id: `r${state.spawned}`, text, x, y, vx, radius: TUNING.riderRadius };
  };

  /**
   * Makes the riders in the air match the words still to strike (at most `maxRiders` from the
   * next one): a rider whose word is not needed leaves nothing behind, a missing word gets a new
   * rider. A sentence of 8 words or fewer starts with all its riders, spread over the arena.
   */
  const fillRiders = (): void => {
    const sentence = state.sentences[state.sentence]!;
    const wanted = sentence.words.slice(state.word, state.word + TUNING.maxRiders);
    const missing = wanted.slice();
    for (const rider of state.riders) {
      const at = missing.findIndex((w) => normWord(w) === normWord(rider.text));
      if (at !== -1) missing.splice(at, 1);
    }
    if (missing.length === 0) return;
    const fresh = state.riders.length === 0;
    const slot = (ARENA.width - 240) / missing.length;
    const order = fresh ? rng.shuffle(missing.map((_, i) => i)) : missing.map(() => -1);
    missing.forEach((text, i) => {
      const x = fresh ? 120 + (order[i]! + 0.2 + rng.next() * 0.6) * slot : rng.range(120, ARENA.width - 120);
      state.riders.push(spawn(text, x));
    });
  };

  const startSentence = (events: JoustEvent[]): void => {
    state.pauseMs = 0;
    fillRiders();
    events.push({ type: 'sentenceStarted', sentence: state.sentence, id: state.sentences[state.sentence]!.id });
  };

  // ------------------------------------------------------------ commands

  const canAct = (): boolean => state.phase === 'playing' && state.restMs <= 0;

  const dispatch = (command: JoustCommand): JoustEvent[] => {
    if (!canAct()) return [];
    const g = state.griffin;
    switch (command.type) {
      case 'flap': {
        if (![-1, 0, 1].includes(command.dir)) return [];
        g.vy = TUNING.flapImpulse;
        if (command.dir !== 0) g.vx = command.dir * TUNING.driftSpeed;
        return [{ type: 'flapped', dir: command.dir }];
      }
      case 'drift': {
        if (command.dir !== -1 && command.dir !== 1) return [];
        g.vx = command.dir * TUNING.driftSpeed;
        return [];
      }
      default:
        return [];
    }
  };

  // ------------------------------------------------------------ the step

  const integrateGriffin = (): void => {
    const g = state.griffin;
    let x = g.x + g.vx * STEP_S;
    let y = g.y + g.vy * STEP_S;
    let vy = Math.min(TUNING.maxVy, g.vy + TUNING.gravity * STEP_S);
    x = ((x % ARENA.width) + ARENA.width) % ARENA.width;
    if (y < TUNING.topMargin) {
      y = TUNING.topMargin;
      vy = 0;
    }
    if (y > ARENA.height - TUNING.bottomMargin) {
      y = ARENA.height - TUNING.bottomMargin;
      vy = 0;
    }
    g.x = x;
    g.y = y;
    g.vx *= DAMP;
    g.vy = vy;
    if (g.safeMs > 0) g.safeMs = Math.max(0, g.safeMs - STEP_MS);
  };

  const moveRiders = (): void => {
    for (const r of state.riders) {
      let x = r.x + r.vx * STEP_S;
      if (x < r.radius || x > ARENA.width - r.radius) {
        r.vx = -r.vx;
        x = Math.max(r.radius, Math.min(ARENA.width - r.radius, r.x + r.vx * STEP_S));
      }
      r.x = x;
    }
  };

  /** A bump: one courage less, a knock back, and the rest at 0. */
  const hurt = (rider: Rider, strike: boolean, events: JoustEvent[]): void => {
    const g = state.griffin;
    g.vx = (g.x >= rider.x ? 1 : -1) * TUNING.knockbackX;
    g.vy = TUNING.knockbackY;
    g.safeMs = TUNING.safeMs;
    state.courage = Math.max(0, state.courage - 1);
    events.push({ type: 'bumped', riderId: rider.id, strike, courage: state.courage });
    if (state.courage === 0) {
      state.restMs = TUNING.restMs;
      state.griffin = startGriffin();
    }
  };

  const finishSentence = (events: JoustEvent[]): void => {
    const sentence = state.sentences[state.sentence]!;
    sentence.cleared = true;
    if (sentence.misses === 0) state.score += TUNING.pointsPerCleanSentence;
    state.riders = [];
    events.push({ type: 'sentenceDone', sentence: state.sentence, id: sentence.id });
    if (state.sentence === state.sentences.length - 1) {
      state.phase = 'complete';
      events.push({ type: 'joustComplete', score: state.score });
      return;
    }
    state.sentence += 1;
    state.word = 0;
    state.pauseMs = TUNING.pauseMs;
  };

  const collide = (events: JoustEvent[]): void => {
    const g = state.griffin;
    if (g.safeMs > 0) return;
    const rider = state.riders.find((r) => Math.hypot(g.x - r.x, g.y - r.y) <= g.radius + r.radius);
    if (!rider) return;
    const strike = g.y < rider.y - rider.radius * 0.5;
    const sentence = state.sentences[state.sentence]!;
    if (strike) sentence.started = true;
    if (strike && isTarget(state, rider)) {
      state.riders.splice(state.riders.indexOf(rider), 1);
      events.push({ type: 'wordStruck', sentence: state.sentence, wordIndex: state.word, text: rider.text, riderId: rider.id, x: rider.x, y: rider.y });
      state.word += 1;
      state.score += TUNING.pointsPerWord;
      g.vy = TUNING.strikeHop;
      if (state.word >= sentence.words.length) finishSentence(events);
      else fillRiders();
      return;
    }
    if (strike) sentence.misses += 1;
    hurt(rider, strike, events);
  };

  return {
    get state() {
      return state;
    },
    dispatch,
    tick() {
      if (state.phase === 'complete') return [];
      const events: JoustEvent[] = [];
      state.timeMs += STEP_MS;
      moveRiders();
      if (state.restMs > 0) {
        state.restMs -= STEP_MS;
        if (state.restMs <= 0) {
          state.restMs = 0;
          state.courage = TUNING.courage;
          state.griffin.safeMs = TUNING.safeMs;
          events.push({ type: 'rested', courage: state.courage });
        }
        return events;
      }
      integrateGriffin();
      if (state.pauseMs > 0) {
        state.pauseMs -= STEP_MS;
        if (state.pauseMs <= 0) startSentence(events);
        return events;
      }
      collide(events);
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
