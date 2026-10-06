/** Shared helpers of the Devourer Slime core tests: story fixtures, teleports, and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createDevourerSlime,
  type DevourerSlimeEvent,
  type DevourerSlimeSimulation,
  type Guard,
} from '../../src/devourer-slime/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): DevourerSlimeSimulation =>
  createDevourerSlime(story, { seed, helper });

export const tickN = (sim: DevourerSlimeSimulation, n: number): DevourerSlimeEvent[] => {
  const events: DevourerSlimeEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

const parked = new WeakMap<DevourerSlimeSimulation, Guard[]>();

/**
 * Takes every guard out of play, so none moves, bumps, or gets swallowed. A test that needs a
 * guard puts it back next to the slime with `wakeGuard`.
 */
export function parkGuards(sim: DevourerSlimeSimulation): void {
  parked.set(sim, [...(parked.get(sim) ?? []), ...sim.state.guards.splice(0)]);
}

/** Puts parked guard `index` back in play next to the slime, still, so a test can use it. */
export function wakeGuard(sim: DevourerSlimeSimulation, index: number, dx = 0.5, dz = 0) {
  const g = (parked.get(sim) ?? sim.state.guards)[index]!;
  if (!sim.state.guards.includes(g)) sim.state.guards.push(g);
  g.x = sim.state.slime.x + dx;
  g.z = sim.state.slime.z + dz;
  g.vx = -1.3;
  g.vz = 0;
  return g;
}

/** Teleports the slime onto a bubble and ticks once. */
export function eat(sim: DevourerSlimeSimulation, bubbleId: string): DevourerSlimeEvent[] {
  const b = sim.state.bubbles.find((x) => x.id === bubbleId);
  if (!b) throw new Error(`no bubble ${bubbleId}`);
  sim.state.slime.x = b.x;
  sim.state.slime.z = b.z;
  return sim.tick();
}

/** The bubble with sentence index `index`. */
export const bubbleAt = (sim: DevourerSlimeSimulation, index: number) =>
  sim.state.bubbles.find((b) => b.index === index)!;

/** Eats every bubble of the sentence in order (guards parked first). */
export function eatAll(sim: DevourerSlimeSimulation): DevourerSlimeEvent[] {
  parkGuards(sim);
  const events: DevourerSlimeEvent[] = [];
  const count = sim.state.bubbles.length;
  for (let i = 0; i < count && sim.state.phase === 'playing'; i++) {
    events.push(...eat(sim, bubbleAt(sim, i).id));
    if (sim.state.next === 0) break; // the next sentence started
  }
  return events;
}

export const ofType = <T extends DevourerSlimeEvent['type']>(events: readonly DevourerSlimeEvent[], type: T) =>
  events.filter((e): e is Extract<DevourerSlimeEvent, { type: T }> => e.type === type);
