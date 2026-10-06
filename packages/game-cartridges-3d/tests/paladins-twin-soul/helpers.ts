/** Shared helpers of the Paladin's Twin Soul tests: story fixtures and the bot run. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createTwinSoul, type TwinSoulEvent, type TwinSoulSimulation, type TwinSoulState } from '../../src/paladins-twin-soul/core/index.js';
import { nextStrike } from '../../src/paladins-twin-soul/qc/bot.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

/** Every story of the demo, in selector order. */
export const STORY_IDS = [
  'pip-is-brave',
  'squeaky-the-small-mouse',
  'pip-and-the-red-car',
  'fun-day-at-the-beach',
  'pips-happy-night',
  'pip-sees-colors',
  'the-new-student',
  'the-school-garden',
];

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const SHORT_STORY = loadStory('the-school-garden');

export const create = (seed = 7, helper = false, story: StoryInput = STORY): TwinSoulSimulation =>
  createTwinSoul(story, { seed, helper });

export const ofType = <T extends TwinSoulEvent['type']>(events: readonly TwinSoulEvent[], type: T) =>
  events.filter((e): e is Extract<TwinSoulEvent, { type: T }> => e.type === type);

export const types = (events: readonly TwinSoulEvent[]) => events.map((e) => e.type);

/** The id of a shade that is not the captor, or null when none is left. */
export function wrongShade(sim: { state: TwinSoulState }): string | null {
  const id = sim.state.target?.itemId;
  return sim.state.shades.find((s) => s.wordId !== id && !s.fallen)?.id ?? null;
}

/** Strikes a wrong shade and returns its events. */
export function wrongStrike(sim: TwinSoulSimulation): TwinSoulEvent[] {
  const shade = wrongShade(sim);
  if (!shade) throw new Error('no wrong shade left');
  return sim.dispatch({ type: 'strike', shade });
}

/** Plays the run to the end with the bot; returns every event. */
export function playToEnd(sim: TwinSoulSimulation, limit = 400): TwinSoulEvent[] {
  const events: TwinSoulEvent[] = [...sim.dispatch({ type: 'start' })];
  for (let i = 0; i < limit && sim.state.phase === 'playing'; i++) {
    const c = nextStrike(sim.state);
    if (!c) throw new Error(`the bot found no captor at strike ${i}`);
    events.push(...sim.dispatch(c));
  }
  return events;
}
