/**
 * The Rune Forge Chamber simulation: a real-time `Simulation` on the fixed step (the clock only
 * turns the orbit and runs the dim and the strike). A sentence is a blade on the anvil, shown as
 * blanks. Up to four runes orbit the anvil: the next word and other words of the sentence. The
 * student chooses a rune (a tap, or the arrow keys and Space). The right rune strikes into the
 * blade and the next wave comes after the strike; a wrong rune dims for 1.5 s, which counts one
 * reading attempt. No health, no defeat, no timer: nothing decides a result but the order of
 * the words. (The legacy game had forge health and a 12 s timer per sentence; both are gone.)
 */
import { STEP_MS, createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { forgeOf, normalWord, waveWordsOf, type RuneForgeChamberInput } from './content.js';
import type {
  ForgeSentence,
  Rune,
  RuneForgeChamberCommand,
  RuneForgeChamberEvent,
  RuneForgeChamberState,
  RuneSpawn,
} from './types.js';

/** The orbit around the anvil in meters, and the turn speed (the legacy 0.0005 rad/ms). */
export const ORBIT = { cx: 0, cz: -0.4, rx: 1.75, rz: 1.45, speed: 0.5 } as const;

/** Every tuning number of the game (section 4 of the design). */
export const TUNING = {
  /** The most blades in one forge. */
  maxBlades: 5,
  /** A rune that took a wrong choice dims this long and cannot be chosen. */
  dimMs: 1500,
  /** The right rune strikes this long before the next wave comes. */
  strikeMs: 800,
} as const;

export type RuneForgeChamberSimulation = Simulation<RuneForgeChamberState, RuneForgeChamberCommand, RuneForgeChamberEvent>;

export interface RuneForgeChamberOptions {
  seed: number;
  helper: boolean;
}

const TAU = Math.PI * 2;
const countDown = (ms: number): number => (ms - STEP_MS < 1e-6 ? 0 : ms - STEP_MS);

/** The place of a rune on the orbit for a base angle and a turn (pure). */
export function orbitPoint(baseAngle: number, rotation: number): { x: number; z: number } {
  const a = baseAngle + rotation;
  return { x: ORBIT.cx + Math.cos(a) * ORBIT.rx, z: ORBIT.cz + Math.sin(a) * ORBIT.rz };
}

/** The word the student must forge next, or null when the sentence is done. */
export function answerOf(state: RuneForgeChamberState): string | null {
  return state.forge[state.sentence]?.words[state.next] ?? null;
}

/** True when this rune holds the next word (a repeated word counts too). */
export function isRight(state: RuneForgeChamberState, rune: Rune): boolean {
  const answer = answerOf(state);
  return answer !== null && normalWord(rune.word) === normalWord(answer);
}

/** The right rune of the wave, or null when there is none. */
export function rightRuneOf(state: RuneForgeChamberState): Rune | null {
  return state.runes.find((r) => isRight(state, r)) ?? null;
}

/** True when a choice of this rune would be taken now. */
export function choosable(state: RuneForgeChamberState, rune: Rune): boolean {
  return state.phase === 'playing' && state.strike === null && rune.dimMs <= 0;
}

export function createRuneForgeChamber(input: RuneForgeChamberInput, options: RuneForgeChamberOptions): RuneForgeChamberSimulation {
  const rng: Rng = createRng(options.seed);
  const forge = forgeOf(input, rng, TUNING.maxBlades);

  const state: RuneForgeChamberState = {
    phase: 'playing',
    helper: options.helper,
    timeMs: 0,
    forge,
    sentence: 0,
    sentences: forge.length,
    next: 0,
    runes: [],
    aimId: null,
    strike: null,
    misses: 0,
    rotation: 0,
    wordsForged: 0,
    sentencesForged: 0,
  };

  const current = (): ForgeSentence => state.forge[state.sentence]!;

  const spawnsOf = (): RuneSpawn[] => state.runes.map(({ id, word, x, z }) => ({ id, word, x, z }));

  /** A new wave for the word `state.next`: the runes get seeded places around the orbit. */
  const startWave = (events: RuneForgeChamberEvent[]): void => {
    const words = waveWordsOf(current().words, state.next, rng);
    const jitter = rng.next() * 0.4;
    state.runes = words.map((word, i) => {
      const baseAngle = -Math.PI / 2 + (TAU * i) / words.length + jitter - state.rotation;
      const at = orbitPoint(baseAngle, state.rotation);
      return { id: `r${i + 1}`, word, baseAngle, x: at.x, z: at.z, dimMs: 0 };
    });
    state.aimId = state.runes[0]?.id ?? null;
    state.strike = null;
    state.misses = 0;
    events.push({ type: 'waveStarted', sentence: state.sentence, next: state.next, runes: spawnsOf() });
  };

  const startSentence = (events: RuneForgeChamberEvent[]): void => {
    const blade = current();
    state.next = 0;
    events.push({ type: 'sentenceStarted', bladeId: blade.bladeId, sentenceId: blade.id, words: blade.words.slice() });
    startWave(events);
  };

  const finishStrike = (events: RuneForgeChamberEvent[]): void => {
    const blade = current();
    state.strike = null;
    if (state.next >= blade.words.length) {
      blade.forged = true;
      state.sentencesForged += 1;
      events.push({ type: 'sentenceForged', bladeId: blade.bladeId, sentenceId: blade.id });
      if (state.sentence + 1 >= state.sentences) {
        state.phase = 'complete';
        state.aimId = null;
        state.runes = [];
        events.push({ type: 'forgeComplete', sentences: state.sentencesForged });
        return;
      }
      state.sentence += 1;
      startSentence(events);
      return;
    }
    startWave(events);
  };

  // The first wave is set up at creation (the view reads the state before the first tick); its
  // events come with the first tick. A forge with no sentences is over before it starts.
  const pending: RuneForgeChamberEvent[] = [];
  if (forge.length === 0) state.phase = 'complete';
  else startSentence(pending);

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      const events: RuneForgeChamberEvent[] = [];
      if (command.type === 'aim') {
        if (state.runes.length === 0) return [];
        const at = state.runes.findIndex((r) => r.id === state.aimId);
        const step = command.dir < 0 ? -1 : 1;
        const to = state.runes[(at + step + state.runes.length * 2) % state.runes.length]!;
        if (to.id !== state.aimId) {
          state.aimId = to.id;
          events.push({ type: 'aimed', runeId: to.id });
        }
        return events;
      }
      if (command.type === 'choose') {
        const id = command.runeId ?? state.aimId;
        const rune = id === null ? undefined : state.runes.find((r) => r.id === id);
        if (!rune || !choosable(state, rune)) return [];
        const blade = current();
        state.aimId = rune.id;
        blade.started = true;
        if (isRight(state, rune)) {
          const index = state.next;
          const first = state.misses === 0;
          state.next += 1;
          state.wordsForged += 1;
          state.strike = { runeId: rune.id, ms: TUNING.strikeMs };
          events.push({ type: 'runeStruck', runeId: rune.id, word: rune.word, index, first });
        } else {
          blade.refusals += 1;
          state.misses += 1;
          rune.dimMs = TUNING.dimMs;
          events.push({ type: 'runeFizzled', runeId: rune.id, word: rune.word });
        }
        return events;
      }
      return [];
    },
    tick() {
      if (state.phase !== 'playing') return [];
      const events = pending.splice(0);
      state.timeMs += STEP_MS;
      state.rotation = (state.timeMs / 1000) * ORBIT.speed;
      for (const rune of state.runes) {
        rune.dimMs = countDown(rune.dimMs);
        const at = orbitPoint(rune.baseAngle, state.rotation);
        rune.x = at.x;
        rune.z = at.z;
      }
      if (state.strike) {
        state.strike.ms = countDown(state.strike.ms);
        if (state.strike.ms <= 0) finishStrike(events);
      }
      return events;
    },
    snapshot: () => structuredClone(state),
  };
}
