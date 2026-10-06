/** Shared helpers of the Magic Defense tests: story fixtures and the bot run. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createMagicDefense, type MagicDefenseEvent, type MagicDefenseSimulation } from '../../src/magic-defense/core/index.js';
import { nextCommand } from '../../src/magic-defense/qc/bot.js';

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

export const create = (seed = 7, helper = false, story: StoryInput = STORY): MagicDefenseSimulation =>
  createMagicDefense(story, { seed, helper });

export const ofType = <T extends MagicDefenseEvent['type']>(events: readonly MagicDefenseEvent[], type: T) =>
  events.filter((e): e is Extract<MagicDefenseEvent, { type: T }> => e.type === type);

export const types = (events: readonly MagicDefenseEvent[]) => events.map((e) => e.type);

/** The choice that carries the word of the prompt. */
export function rightChoice(sim: MagicDefenseSimulation): number {
  const round = sim.state.round!;
  return round.choices.find((c) => c.wordId === round.wordId)!.index;
}

/** A choice that is not the right one and not failed yet. */
export function wrongChoice(sim: MagicDefenseSimulation): number {
  const round = sim.state.round!;
  const choice = round.choices.find((c) => c.wordId !== round.wordId && !c.blocked);
  if (!choice) throw new Error('no wrong choice');
  return choice.index;
}

export const castRight = (sim: MagicDefenseSimulation): MagicDefenseEvent[] => sim.dispatch({ type: 'cast', choice: rightChoice(sim) });
export const castWrong = (sim: MagicDefenseSimulation): MagicDefenseEvent[] => sim.dispatch({ type: 'cast', choice: wrongChoice(sim) });

/** Plays the run to the end with the bot; returns every event. */
export function playToEnd(sim: MagicDefenseSimulation, limit = 400): MagicDefenseEvent[] {
  const events: MagicDefenseEvent[] = [...sim.dispatch({ type: 'start' })];
  for (let i = 0; i < limit && sim.state.phase === 'playing'; i++) {
    const c = nextCommand(sim.state);
    if (!c) throw new Error(`the bot found no command at step ${i}`);
    events.push(...sim.dispatch(c));
  }
  return events;
}
