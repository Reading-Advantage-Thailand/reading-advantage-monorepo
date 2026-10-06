/** Shared helpers of the Castle Defense tests: story fixtures and the bot run. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createCastleDefense, type CastleDefenseEvent, type CastleDefenseSimulation } from '../../src/castle-defense/core/index.js';
import { nextCommand } from '../../src/castle-defense/qc/bot.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

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

export const create = (seed = 7, helper = false, story: StoryInput = STORY): CastleDefenseSimulation =>
  createCastleDefense(story, { seed, helper });

export const ofType = <T extends CastleDefenseEvent['type']>(events: readonly CastleDefenseEvent[], type: T) =>
  events.filter((e): e is Extract<CastleDefenseEvent, { type: T }> => e.type === type);

export const types = (events: readonly CastleDefenseEvent[]) => events.map((e) => e.type);

/** The choice that carries the next word. */
export const rightChoice = (sim: CastleDefenseSimulation): number => sim.state.step!.choices.find((c) => c.right)!.index;

/** A choice that is not the right one and not failed yet. */
export function wrongChoice(sim: CastleDefenseSimulation): number {
  const choice = sim.state.step!.choices.find((c) => !c.right && !c.blocked);
  if (!choice) throw new Error('no wrong choice');
  return choice.index;
}

export const pickRight = (sim: CastleDefenseSimulation): CastleDefenseEvent[] => sim.dispatch({ type: 'pick', choice: rightChoice(sim) });
export const pickWrong = (sim: CastleDefenseSimulation): CastleDefenseEvent[] => sim.dispatch({ type: 'pick', choice: wrongChoice(sim) });

/** Builds the whole current sentence with right words; returns the events. */
export function buildSentence(sim: CastleDefenseSimulation): CastleDefenseEvent[] {
  const events: CastleDefenseEvent[] = [];
  while (sim.state.stage === 'collect' && sim.state.phase === 'playing') events.push(...pickRight(sim));
  return events;
}

/** Plays the run to the end with the bot; returns every event. */
export function playToEnd(sim: CastleDefenseSimulation, limit = 600): CastleDefenseEvent[] {
  const events: CastleDefenseEvent[] = [...sim.dispatch({ type: 'start' })];
  for (let i = 0; i < limit && sim.state.phase === 'playing'; i++) {
    const c = nextCommand(sim.state);
    if (!c) throw new Error(`the bot found no command at step ${i}`);
    events.push(...sim.dispatch(c));
  }
  return events;
}
