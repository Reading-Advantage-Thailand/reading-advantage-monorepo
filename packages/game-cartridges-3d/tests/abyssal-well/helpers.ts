/** Shared helpers of the Abyssal Well tests: story fixtures and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import {
  createAbyssalWell,
  nextEnemyOf,
  type AbyssalWellEvent,
  type AbyssalWellSimulation,
  type Enemy,
} from '../../src/abyssal-well/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

/** A started run (the `start` command is played). */
export function create(seed = 7, helper = false, story: StoryInput = STORY): AbyssalWellSimulation {
  const sim = createAbyssalWell(story, { seed, helper });
  sim.dispatch({ type: 'start' });
  return sim;
}

export const ofType = <T extends AbyssalWellEvent['type']>(events: readonly AbyssalWellEvent[], type: T) =>
  events.filter((e): e is Extract<AbyssalWellEvent, { type: T }> => e.type === type);

export const types = (events: readonly AbyssalWellEvent[]) => events.map((e) => e.type);

/** An enemy that does not hold the next word (a wrong target). */
export function wrongEnemy(sim: AbyssalWellSimulation): Enemy {
  const next = nextEnemyOf(sim.state)!;
  const wrong = sim.state.enemies.find((e) => e !== next && e.word.toLowerCase().replace(/\W/g, '') !== next.word.toLowerCase().replace(/\W/g, ''));
  if (!wrong) throw new Error('no wrong enemy');
  return wrong;
}

export const shootRight = (sim: AbyssalWellSimulation): AbyssalWellEvent[] => sim.dispatch({ type: 'fire', lane: nextEnemyOf(sim.state)!.lane });
export const shootWrong = (sim: AbyssalWellSimulation): AbyssalWellEvent[] => sim.dispatch({ type: 'fire', lane: wrongEnemy(sim).lane });

/** Hits every word of the current descent in order. */
export function clearDescent(sim: AbyssalWellSimulation): AbyssalWellEvent[] {
  const events: AbyssalWellEvent[] = [];
  const descent = sim.state.descent;
  while (sim.state.phase === 'playing' && sim.state.descent === descent) events.push(...shootRight(sim));
  return events;
}
