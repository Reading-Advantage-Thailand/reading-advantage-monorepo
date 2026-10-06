/**
 * The Alchemist's Synthesis simulation: a real-time `Simulation` on the fixed step (the clock
 * only runs the dim and the pour). Each formula shows a meaning; four jars on the bench carry
 * English terms. The student chooses a jar (a tap, or the arrow keys and Space). The right jar
 * pours into the cauldron and the next formula comes after the pour; a wrong jar dims for 1.5 s,
 * which counts one reading attempt. No lives, no defeat, no timer: nothing decides a result but
 * the answers.
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { formulasOf, jarsFor, type AlchemistsSynthesisInput } from './content.js';
import type {
  AlchemistsSynthesisCommand,
  AlchemistsSynthesisEvent,
  AlchemistsSynthesisState,
  Formula,
  Jar,
} from './types.js';

/** Every tuning number of the game (section 4 of the design). */
export const TUNING = {
  /** The most formulas in one synthesis. */
  maxWords: 10,
  /** Jars on the bench (fewer when the story has fewer distinct terms). */
  jars: 4,
  /** A jar that took a wrong choice dims this long and cannot be chosen. */
  dimMs: 1500,
  /** The right jar pours this long before the next formula comes. */
  pourMs: 900,
} as const;

export type AlchemistsSynthesisSimulation = Simulation<AlchemistsSynthesisState, AlchemistsSynthesisCommand, AlchemistsSynthesisEvent>;

export interface AlchemistsSynthesisOptions {
  seed: number;
  helper: boolean;
}

const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

/** The right jar of the current formula, or null when there is none. */
export function correctJarOf(state: AlchemistsSynthesisState): Jar | null {
  return state.jars.find((j) => j.correct) ?? null;
}

/** True when a choice of this jar would be taken now. */
export function choosable(state: AlchemistsSynthesisState, jar: Jar): boolean {
  return state.phase === 'playing' && state.pour === null && jar.dimMs <= 0;
}

export function createAlchemistsSynthesis(input: AlchemistsSynthesisInput, options: AlchemistsSynthesisOptions): AlchemistsSynthesisSimulation {
  const rng: Rng = createRng(options.seed);
  const words = formulasOf(input, rng, TUNING.maxWords);

  const state: AlchemistsSynthesisState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    words,
    round: 0,
    rounds: words.length,
    jars: [],
    aimId: null,
    pour: null,
    brewed: 0,
    correct: 0,
  };

  const current = (): Formula => state.words[state.round]!;

  const startRound = (events: AlchemistsSynthesisEvent[]): void => {
    const word = current();
    const options = jarsFor(word, words, TUNING.jars, rng);
    state.jars = options.map((o, i) => ({ id: `j${i + 1}`, term: o.term, wordId: o.wordId, kind: o.kind, correct: o.correct, dimMs: 0 }));
    state.aimId = state.jars[0]?.id ?? null;
    state.pour = null;
    events.push({
      type: 'roundStarted',
      round: state.round,
      wordId: word.id,
      translation: word.translation,
      jars: state.jars.map(({ id, term, kind }) => ({ id, term, kind })),
    });
  };

  const finishPour = (events: AlchemistsSynthesisEvent[]): void => {
    const word = current();
    state.brewed += 1;
    state.pour = null;
    events.push({ type: 'elixirBrewed', round: state.round, wordId: word.id, brewed: state.brewed });
    if (state.round + 1 >= state.rounds) {
      state.phase = 'complete';
      state.aimId = null;
      events.push({ type: 'synthesisComplete', rounds: state.brewed });
      return;
    }
    state.round += 1;
    startRound(events);
  };

  // The first round is set up at creation (the view reads the state before the first tick); its
  // `roundStarted` event comes with the first tick. A synthesis with no words is over before it starts.
  const pending: AlchemistsSynthesisEvent[] = [];
  if (words.length === 0) state.phase = 'complete';
  else startRound(pending);

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      const events: AlchemistsSynthesisEvent[] = [];
      if (command.type === 'aim') {
        if (state.jars.length === 0) return [];
        const at = state.jars.findIndex((j) => j.id === state.aimId);
        const step = command.dir < 0 ? -1 : 1;
        const to = state.jars[(at + step + state.jars.length * 2) % state.jars.length]!;
        if (to.id !== state.aimId) {
          state.aimId = to.id;
          events.push({ type: 'aimed', jarId: to.id });
        }
        return events;
      }
      if (command.type === 'choose') {
        const id = command.jarId ?? state.aimId;
        const jar = id === null ? undefined : state.jars.find((j) => j.id === id);
        if (!jar || !choosable(state, jar)) return [];
        const word = current();
        state.aimId = jar.id;
        word.started = true;
        word.attempts += 1;
        if (jar.correct) {
          word.solved = true;
          state.correct += 1;
          state.pour = { jarId: jar.id, ms: TUNING.pourMs };
          events.push({ type: 'jarPoured', jarId: jar.id, wordId: word.id, first: word.attempts === 1 });
        } else {
          jar.dimMs = TUNING.dimMs;
          events.push({ type: 'jarFizzled', jarId: jar.id, wordId: word.id });
        }
        return events;
      }
      return [];
    },
    tick() {
      if (state.phase !== 'playing') return [];
      const events = pending.splice(0);
      state.timeMs += STEP_MS;
      for (const jar of state.jars) jar.dimMs = countDown(jar.dimMs);
      if (state.pour) {
        state.pour.ms = countDown(state.pour.ms);
        if (state.pour.ms <= 0) finishPour(events);
      }
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
