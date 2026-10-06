/** Shared helpers of the RPG Battle tests: story fixtures and the bot run. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRpgBattle, type RpgBattleEvent, type RpgBattleSimulation } from '../../src/rpg-battle/core/index.js';
import { nextCommand } from '../../src/rpg-battle/qc/bot.js';

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

export const create = (seed = 7, helper = false, story: StoryInput = STORY): RpgBattleSimulation =>
  createRpgBattle(story, { seed, helper });

export const ofType = <T extends RpgBattleEvent['type']>(events: readonly RpgBattleEvent[], type: T) =>
  events.filter((e): e is Extract<RpgBattleEvent, { type: T }> => e.type === type);

export const types = (events: readonly RpgBattleEvent[]) => events.map((e) => e.type);

/** An option id that is not the right one for the question now. */
export function wrongOption(sim: RpgBattleSimulation): string {
  const q = sim.state.question!;
  const wrong = q.options.find((o) => o.id !== q.cardId);
  if (!wrong) throw new Error('no wrong option');
  return wrong.id;
}

/** Plays a card and answers it wrong; returns the events of the answer. */
export function playWrong(sim: RpgBattleSimulation, cardId = sim.state.hand[0]!.id): RpgBattleEvent[] {
  sim.dispatch({ type: 'play', cardId });
  return sim.dispatch({ type: 'answer', optionId: wrongOption(sim) });
}

/** Plays a card and answers it right; returns the events of the answer. */
export function playRight(sim: RpgBattleSimulation, cardId = sim.state.hand[0]!.id): RpgBattleEvent[] {
  sim.dispatch({ type: 'play', cardId });
  return sim.dispatch({ type: 'answer', optionId: cardId });
}

/** Plays the run to the end with the bot; returns every event. */
export function playToEnd(sim: RpgBattleSimulation, limit = 400): RpgBattleEvent[] {
  const events: RpgBattleEvent[] = [...sim.dispatch({ type: 'start' })];
  for (let i = 0; i < limit && sim.state.phase === 'playing'; i++) {
    const c = nextCommand(sim.state);
    if (!c) throw new Error(`the bot found no command at step ${i}`);
    events.push(...sim.dispatch(c));
  }
  return events;
}
