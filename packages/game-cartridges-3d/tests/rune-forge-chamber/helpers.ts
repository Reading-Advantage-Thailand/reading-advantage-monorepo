/** Shared helpers of the Rune Forge Chamber core tests: story fixtures and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createRuneForgeChamber,
  rightRuneOf,
  type RuneForgeChamberEvent,
  type RuneForgeChamberSimulation,
} from '../../src/rune-forge-chamber/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): RuneForgeChamberSimulation =>
  createRuneForgeChamber(story, { seed, helper });

export const tickN = (sim: RuneForgeChamberSimulation, n: number): RuneForgeChamberEvent[] => {
  const events: RuneForgeChamberEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Chooses a rune and ticks until the strike (if any) ends; returns the dispatch and tick events. */
export function pick(sim: RuneForgeChamberSimulation, runeId?: string): RuneForgeChamberEvent[] {
  const events = [...sim.dispatch({ type: 'choose', ...(runeId ? { runeId } : {}) })];
  for (let i = 0; i < 200 && sim.state.strike !== null; i++) events.push(...sim.tick());
  return events;
}

/** Strikes the right rune of the current wave. */
export const strikeRight = (sim: RuneForgeChamberSimulation): RuneForgeChamberEvent[] => pick(sim, rightRuneOf(sim.state)!.id);

/** Forges every word of the current sentence. */
export function forgeSentence(sim: RuneForgeChamberSimulation): RuneForgeChamberEvent[] {
  const events: RuneForgeChamberEvent[] = [];
  const sentence = sim.state.sentence;
  while (sim.state.phase === 'playing' && sim.state.sentence === sentence) events.push(...strikeRight(sim));
  return events;
}

export const ofType = <T extends RuneForgeChamberEvent['type']>(events: readonly RuneForgeChamberEvent[], type: T) =>
  events.filter((e): e is Extract<RuneForgeChamberEvent, { type: T }> => e.type === type);
