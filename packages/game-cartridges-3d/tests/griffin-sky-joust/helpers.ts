/** Shared helpers of the Griffin Sky-Joust core tests: story fixtures and run loops. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createGriffinSkyJoust,
  isTarget,
  type JoustEvent,
  type JoustSimulation,
} from '../../src/griffin-sky-joust/core/index.js';
import { nextCommand } from '../../src/griffin-sky-joust/qc/bot.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

/** 12 sentences (the game caps at 4) and 6 longer sentences. */
export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): JoustSimulation =>
  createGriffinSkyJoust(story, { seed, helper });

export const tickN = (sim: JoustSimulation, n: number): JoustEvent[] => {
  const events: JoustEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Ticks until `until` is true (checked after each tick) or `maxSteps` pass; returns all events. */
export function runUntil(sim: JoustSimulation, until: () => boolean, maxSteps = 6000): { events: JoustEvent[]; hit: boolean } {
  const events: JoustEvent[] = [];
  for (let steps = 0; steps < maxSteps; steps++) {
    if (until()) return { events, hit: true };
    events.push(...sim.tick());
  }
  return { events, hit: until() };
}

/** Plays with the bot called every `paceSteps` steps until the game is complete or `maxSteps` pass. */
export function playBot(sim: JoustSimulation, paceSteps = 3, maxSteps = stepsOf(15 * 60_000)): { events: JoustEvent[]; steps: number } {
  const events: JoustEvent[] = [];
  let steps = 0;
  while (sim.state.phase !== 'complete' && steps < maxSteps) {
    if (steps % paceSteps === 0) {
      const c = nextCommand(sim.state);
      if (c) events.push(...sim.dispatch(c));
    }
    events.push(...sim.tick());
    steps += 1;
  }
  return { events, steps };
}

export const ofType = <T extends JoustEvent['type']>(events: readonly JoustEvent[], type: T) =>
  events.filter((e): e is Extract<JoustEvent, { type: T }> => e.type === type);

/** Ticks until the first sentence has its riders (the opening beat is over). */
export function untilRiders(sim: JoustSimulation): JoustEvent[] {
  return runUntil(sim, () => sim.state.riders.length > 0).events;
}

/** The rider that carries the word to strike now. */
export function targetRider(sim: JoustSimulation) {
  const rider = sim.state.riders.find((r) => isTarget(sim.state, r));
  if (!rider) throw new Error('no target rider');
  return rider;
}

/** Puts the griffin just above (strike) or beside (bump) a rider, ready to touch it on the next tick. */
export function placeOn(sim: JoustSimulation, rider: { x: number; y: number }, how: 'above' | 'side' | 'below'): void {
  const g = sim.state.griffin;
  g.safeMs = 0;
  g.vx = 0;
  g.vy = 0;
  g.x = rider.x;
  g.y = how === 'above' ? rider.y - 48 : how === 'below' ? rider.y + 48 : rider.y;
  if (how === 'side') g.x = rider.x - 40;
}
