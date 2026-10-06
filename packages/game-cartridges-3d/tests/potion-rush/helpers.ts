/** Shared helpers of the Potion Rush core tests: story fixtures, run-until, and word feeding. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createPotionRush,
  nextWordOf,
  type PotionRushEvent,
  type PotionRushSimulation,
} from '../../src/potion-rush/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const SHORT_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): PotionRushSimulation =>
  createPotionRush(story, { seed, helper });

/** Ticks until `until` returns true (checked on each tick's events) or `maxSteps` pass; returns all events. */
export function runUntil(
  sim: PotionRushSimulation,
  until: (now: PotionRushEvent[]) => boolean,
  maxSteps = 6000,
): { events: PotionRushEvent[]; steps: number; hit: boolean } {
  const events: PotionRushEvent[] = [];
  for (let steps = 1; steps <= maxSteps; steps++) {
    const now = sim.tick();
    events.push(...now);
    if (until(now)) return { events, steps, hit: true };
  }
  return { events, steps: maxSteps, hit: false };
}

export const tickN = (sim: PotionRushSimulation, n: number): PotionRushEvent[] => {
  const events: PotionRushEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Ticks until an item with `word` (case-insensitive) rides the belt, then drops it into `cauldron`. */
export function feed(sim: PotionRushSimulation, cauldron: number, word: string, maxSteps = 6000): PotionRushEvent[] {
  const find = () => sim.state.belt.find((i) => i.word.toLowerCase() === word.toLowerCase());
  if (!find()) {
    const run = runUntil(sim, () => find() !== undefined, maxSteps);
    if (!run.hit) throw new Error(`the word "${word}" never rode the belt in ${maxSteps} steps`);
  }
  return sim.dispatch({ type: 'drop', itemId: find()!.id, cauldron });
}

/** Feeds every remaining word of cauldron `i`'s order, in order. */
export function brew(sim: PotionRushSimulation, cauldron: number): PotionRushEvent[] {
  const events: PotionRushEvent[] = [];
  for (let guard = 0; guard < 20; guard++) {
    const next = nextWordOf(sim.state, cauldron);
    if (next === null) break;
    events.push(...feed(sim, cauldron, next));
  }
  return events;
}

export const ofType = <T extends PotionRushEvent['type']>(events: readonly PotionRushEvent[], type: T) =>
  events.filter((e): e is Extract<PotionRushEvent, { type: T }> => e.type === type);
