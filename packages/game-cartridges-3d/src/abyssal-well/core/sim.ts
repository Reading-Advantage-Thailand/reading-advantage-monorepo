/**
 * The Abyssal Well simulation: a turn `Simulation` (`tick` returns []). Eight lanes run from the
 * bottom of a well to its rim, where the archer stands. Word enemies climb the lanes: the next
 * three words of the sentence and one echo enemy (a word that is not in the sentence). The
 * student shoots the enemy that holds the next word of the sentence, in order. A right arrow
 * drops that enemy into the sentence. A wrong arrow bounces off: the enemy is thrown back to the
 * bottom, the team loses 1 courage, and the shot counts a reading attempt; at 0 courage the team
 * rests back to 3. After every shot the enemies that are left climb one step (at most to the
 * rim). There is no game over and no timer: nothing decides a result but the order of the words.
 *
 * Event order per command:
 *   start: descentStarted
 *   rotate: moved
 *   fire right: [moved], fired, struck, [climbed, spawned] | [descentCleared, [descentStarted | wellComplete]]
 *   fire wrong: [moved], fired, repelled, courageLost, [rest], climbed
 */
import { createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { descentsOf, echoWordOf, normalWord, type AbyssalWellInput } from './content.js';
import {
  CREATURES,
  LANES,
  RIM_DEPTH,
  type AbyssalWellCommand,
  type AbyssalWellEvent,
  type AbyssalWellState,
  type Enemy,
  type EnemyKind,
  type EnemyShown,
} from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  /** The most descents in one run. */
  maxDescents: 4,
  /** How many of the next words stand in the well at once (the echo enemy comes on top). */
  window: 3,
  maxCourage: 5,
  restCourage: 3,
  /** Points per word hit and per descent cleared. */
  wordScore: 10,
  descentScore: 50,
} as const;

export type AbyssalWellSimulation = Simulation<AbyssalWellState, AbyssalWellCommand, AbyssalWellEvent>;

export interface AbyssalWellOptions {
  seed: number;
  helper: boolean;
}

/** The enemy that holds the next word, or null when the sentence is complete. */
export function nextEnemyOf(state: AbyssalWellState): Enemy | null {
  return state.enemies.find((e) => e.kind === 'word' && e.index === state.next) ?? null;
}

/** The enemy in a lane, if any. */
export function enemyInLane(state: AbyssalWellState, lane: number): Enemy | null {
  return state.enemies.find((e) => e.lane === lane) ?? null;
}

const shown = (e: Enemy): EnemyShown => ({ id: e.id, lane: e.lane, depth: e.depth, word: e.word, kind: e.kind, index: e.index, creature: e.creature });

export function createAbyssalWell(input: AbyssalWellInput, options: AbyssalWellOptions): AbyssalWellSimulation {
  const rng: Rng = createRng(options.seed);
  const descents = descentsOf(input, rng, TUNING.maxDescents);

  const state: AbyssalWellState = {
    phase: descents.length > 0 ? 'playing' : 'complete',
    helper: options.helper,
    started: false,
    descents,
    descent: 0,
    descentCount: descents.length,
    lane: 0,
    enemies: [],
    next: 0,
    struck: 0,
    descentsCleared: 0,
    courage: TUNING.maxCourage,
    maxCourage: TUNING.maxCourage,
    shots: 0,
    spawned: 0,
  };

  const current = () => state.descents[state.descent]!;

  const makeEnemy = (word: string, kind: EnemyKind, index: number, lane: number, depth: number): Enemy => {
    state.spawned += 1;
    return { id: `e${state.spawned}`, lane, depth, word, kind, index, creature: CREATURES[(state.spawned - 1) % CREATURES.length]! };
  };

  const freeLane = (): number => rng.pick(Array.from({ length: LANES }, (_, i) => i).filter((l) => !state.enemies.some((e) => e.lane === l)));

  /** Sets up the enemies of the current descent: the first words and the echo enemy. */
  const setUpDescent = (): void => {
    const d = current();
    state.next = 0;
    const lanes = rng.shuffle(Array.from({ length: LANES }, (_, i) => i));
    const count = Math.min(TUNING.window, d.words.length);
    state.enemies = Array.from({ length: count }, (_, i) => makeEnemy(d.words[i]!, 'word', i, lanes[i]!, Math.max(0, TUNING.window - 1 - i)));
    const echo = echoWordOf(input, d.id, d.words, rng);
    if (echo !== null) state.enemies.push(makeEnemy(echo, 'echo', -1, lanes[count]!, 1));
  };

  const descentStarted = (): AbyssalWellEvent => {
    const d = current();
    const event: AbyssalWellEvent = { type: 'descentStarted', descentId: d.descentId, sentenceId: d.id, words: d.words.slice(), enemies: state.enemies.map(shown) };
    if (d.translation !== undefined) event.translation = d.translation;
    return event;
  };

  if (descents.length > 0) setUpDescent();

  /** Every enemy that is left climbs one step; `reset` is thrown back to the bottom. */
  const climb = (reset: Enemy | null): AbyssalWellEvent => {
    const moves: { id: string; depth: number }[] = [];
    for (const e of state.enemies) {
      const before = e.depth;
      e.depth = e === reset ? 0 : Math.min(RIM_DEPTH, e.depth + 1);
      if (e.depth !== before) moves.push({ id: e.id, depth: e.depth });
    }
    return { type: 'climbed', moves };
  };

  /** Fills the window with the next words that have no enemy yet. */
  const refill = (events: AbyssalWellEvent[]): void => {
    const d = current();
    for (let i = state.next; i < Math.min(state.next + TUNING.window, d.words.length); i++) {
      if (state.enemies.some((e) => e.kind === 'word' && e.index === i)) continue;
      const enemy = makeEnemy(d.words[i]!, 'word', i, freeLane(), 0);
      state.enemies.push(enemy);
      events.push({ type: 'spawned', enemy: shown(enemy) });
    }
  };

  const rotate = (dir: number): AbyssalWellEvent[] => {
    if (!state.started) return [{ type: 'rejected', command: 'rotate' }];
    state.lane = (((state.lane + (dir < 0 ? -1 : 1)) % LANES) + LANES) % LANES;
    return [{ type: 'moved', lane: state.lane }];
  };

  const fire = (laneArg: number | undefined): AbyssalWellEvent[] => {
    const lane = laneArg ?? state.lane;
    const target = Number.isInteger(lane) ? enemyInLane(state, lane) : null;
    const expected = nextEnemyOf(state);
    if (!state.started || !target || !expected) return [{ type: 'rejected', command: 'fire' }];
    const events: AbyssalWellEvent[] = [];
    if (state.lane !== lane) {
      state.lane = lane;
      events.push({ type: 'moved', lane });
    }
    const d = current();
    d.started = true;
    state.shots += 1;
    const correct = target.kind === 'word' && normalWord(target.word) === normalWord(expected.word);
    events.push({ type: 'fired', lane, enemyId: target.id, correct });

    if (!correct) {
      d.refusals += 1;
      events.push({ type: 'repelled', enemyId: target.id });
      state.courage = Math.max(0, state.courage - 1);
      events.push({ type: 'courageLost', courage: state.courage });
      if (state.courage === 0) {
        state.courage = TUNING.restCourage;
        events.push({ type: 'rest', courage: state.courage });
      }
      events.push(climb(target));
      return events;
    }

    // A repeated word ("the ... the") is the same word: the two enemies swap their places in the order.
    if (target !== expected) {
      expected.index = target.index;
      target.index = state.next;
    }
    state.enemies = state.enemies.filter((e) => e !== target);
    state.next += 1;
    state.struck += 1;
    events.push({ type: 'struck', enemyId: target.id, index: target.index });

    if (state.next >= d.words.length) {
      d.cleared = true;
      state.descentsCleared += 1;
      state.enemies = [];
      events.push({ type: 'descentCleared', descentId: d.descentId, sentenceId: d.id });
      if (state.descent + 1 >= state.descentCount) {
        state.phase = 'complete';
        events.push({ type: 'wellComplete', descents: state.descentsCleared });
        return events;
      }
      state.descent += 1;
      setUpDescent();
      events.push(descentStarted());
      return events;
    }
    events.push(climb(null));
    refill(events);
    return events;
  };

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      switch (command.type) {
        case 'start':
          if (state.started) return [{ type: 'rejected', command: 'start' }];
          state.started = true;
          return [descentStarted()];
        case 'rotate':
          return rotate(command.dir);
        case 'fire':
          return fire(command.lane);
        default:
          return [];
      }
    },
    tick: () => [],
    snapshot: () => structuredClone(state),
  };
}
