/** Shared helpers of the Alchemist's Synthesis core tests: story fixtures and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  correctJarOf,
  createAlchemistsSynthesis,
  type AlchemistsSynthesisEvent,
  type AlchemistsSynthesisSimulation,
} from '../../src/alchemists-synthesis/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const SHORT_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): AlchemistsSynthesisSimulation =>
  createAlchemistsSynthesis(story, { seed, helper });

export const tickN = (sim: AlchemistsSynthesisSimulation, n: number): AlchemistsSynthesisEvent[] => {
  const events: AlchemistsSynthesisEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Chooses a jar and ticks until the pour (if any) ends; returns the dispatch and tick events. */
export function pick(sim: AlchemistsSynthesisSimulation, jarId?: string): AlchemistsSynthesisEvent[] {
  const events = [...sim.dispatch({ type: 'choose', ...(jarId ? { jarId } : {}) })];
  for (let i = 0; i < 200 && sim.state.pour !== null; i++) events.push(...sim.tick());
  return events;
}

/** Answers the current formula right. */
export const answer = (sim: AlchemistsSynthesisSimulation): AlchemistsSynthesisEvent[] => pick(sim, correctJarOf(sim.state)!.id);

export const ofType = <T extends AlchemistsSynthesisEvent['type']>(events: readonly AlchemistsSynthesisEvent[], type: T) =>
  events.filter((e): e is Extract<AlchemistsSynthesisEvent, { type: T }> => e.type === type);
