/**
 * The Sorcerer's Ziggurat 3D simulation: a turn-based `Simulation` (tick returns no events). The
 * student climbs one tier per word of the sentence. Each tier offers up to three rune cubes; the
 * cube with the next word takes the hero up, any other cube crumbles, counts one reading attempt,
 * and costs one courage. At 0 courage the team rests: courage is full again, the crumbled cubes
 * of the tier return, and the hero keeps its place. No timer, no game over: nothing decides a
 * result but the order of the words.
 */
import { createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { climbOf, cubesOf, type ZigguratInput } from './content.js';
import type { Cube, CubeSpawn, Ritual, ZigguratCommand, ZigguratEvent, ZigguratState } from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  /** The most rituals (sentences) in one climb. */
  maxRituals: 5,
  /** Courage at the start and after a rest. */
  courage: 4,
} as const;

export type ZigguratSimulation = Simulation<ZigguratState, ZigguratCommand, ZigguratEvent>;

export interface ZigguratOptions {
  seed: number;
  helper: boolean;
}

/** The cube of the next word, or null when the climb is complete. */
export function correctCubeOf(state: ZigguratState): Cube | null {
  return state.cubes.find((c) => c.correct) ?? null;
}

const spawnOf = (cubes: readonly Cube[]): CubeSpawn[] => cubes.map(({ id, word, lane, correct }) => ({ id, word, lane, correct }));

/** The events that open the current ritual and tier (the view also reads them for the first ritual). */
export function openingEvents(state: ZigguratState): ZigguratEvent[] {
  const ritual = state.climb[state.ritual];
  if (!ritual || state.phase !== 'climbing') return [];
  return [
    {
      type: 'ritualStarted',
      ritualId: ritual.ritualId,
      sentenceId: ritual.id,
      words: ritual.words.slice(),
      ...(ritual.translation !== undefined ? { translation: ritual.translation } : {}),
    },
    { type: 'tierOffered', tier: state.tier, cubes: spawnOf(state.cubes) },
  ];
}

export function createSorcererZiggurat(input: ZigguratInput, options: ZigguratOptions): ZigguratSimulation {
  const rng: Rng = createRng(options.seed);
  const climb: Ritual[] = climbOf(input, rng, TUNING.maxRituals);

  const state: ZigguratState = {
    phase: 'climbing',
    helper: options.helper,
    climb,
    ritual: 0,
    rituals: climb.length,
    tier: 0,
    hero: { lane: 'forward', tier: 0 },
    cubes: [],
    courage: TUNING.courage,
    maxCourage: TUNING.courage,
    steps: 0,
    ritualsCleared: 0,
    crumbled: 0,
    rests: 0,
  };

  const current = (): Ritual => state.climb[state.ritual]!;
  const offer = (): void => {
    state.cubes = cubesOf(input, current(), state.ritual, state.tier, rng);
  };

  if (climb.length === 0) state.phase = 'complete';
  else offer();

  const step = (cube: Cube, events: ZigguratEvent[]): void => {
    const ritual = current();
    state.steps += 1;
    state.tier += 1;
    state.hero = { lane: cube.lane, tier: state.tier };
    events.push({ type: 'stepped', cubeId: cube.id, lane: cube.lane, tier: state.tier });
    if (state.tier < ritual.words.length) {
      offer();
      events.push({ type: 'tierOffered', tier: state.tier, cubes: spawnOf(state.cubes) });
      return;
    }
    ritual.cleared = true;
    state.ritualsCleared += 1;
    state.cubes = [];
    events.push({ type: 'ritualCleared', ritualId: ritual.ritualId, sentenceId: ritual.id });
    if (state.ritual + 1 >= state.rituals) {
      state.phase = 'complete';
      events.push({ type: 'climbComplete', rituals: state.ritualsCleared });
      return;
    }
    state.ritual += 1;
    state.tier = 0;
    state.hero = { lane: 'forward', tier: 0 };
    offer();
    events.push(...openingEvents(state));
  };

  const crumble = (cube: Cube, events: ZigguratEvent[]): void => {
    cube.spent = true;
    current().refusals += 1;
    state.crumbled += 1;
    state.courage -= 1;
    events.push({ type: 'cubeCrumbled', id: cube.id, lane: cube.lane });
    events.push({ type: 'courageChanged', courage: state.courage });
    if (state.courage > 0) return;
    // The team rests: full courage, the crumbled cubes of this tier return, the hero keeps its place.
    state.courage = state.maxCourage;
    state.rests += 1;
    const restored = state.cubes.filter((c) => c.spent).map((c) => c.id);
    for (const c of state.cubes) c.spent = false;
    events.push({ type: 'teamRested', courage: state.courage, restored });
  };

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'climbing' || command.type !== 'step') return [];
      const cube = state.cubes.find((c) => (command.cubeId !== undefined ? c.id === command.cubeId : c.lane === command.lane));
      if (!cube || cube.spent) return [];
      current().started = true;
      const events: ZigguratEvent[] = [];
      if (cube.correct) step(cube, events);
      else crumble(cube, events);
      return events;
    },
    tick: () => [],
    snapshot: () => structuredClone(state),
  };
}
