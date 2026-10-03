/** Shared helpers of the Archer's Revenge tests: story fixtures and the bot run. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createArchersRevenge, type ArchersRevengeEvent, type ArchersRevengeSimulation } from '../../src/archers-revenge/core/index.js';
import { nextCommand } from '../../src/archers-revenge/qc/bot.js';

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

export const create = (seed = 7, helper = false, story: StoryInput = STORY): ArchersRevengeSimulation =>
  createArchersRevenge(story, { seed, helper });

export const ofType = <T extends ArchersRevengeEvent['type']>(events: readonly ArchersRevengeEvent[], type: T) =>
  events.filter((e): e is Extract<ArchersRevengeEvent, { type: T }> => e.type === type);

export const types = (events: readonly ArchersRevengeEvent[]) => events.map((e) => e.type);

/** The lane that carries the word of the prompt. */
export function rightLane(sim: ArchersRevengeSimulation): number {
  const round = sim.state.round!;
  return round.lanes.find((l) => l.wordId === round.wordId)!.lane;
}

/** A lane that is not the right one and not shot yet. */
export function wrongLane(sim: ArchersRevengeSimulation): number {
  const round = sim.state.round!;
  const lane = round.lanes.find((l) => l.wordId !== round.wordId && !l.blocked);
  if (!lane) throw new Error('no wrong lane');
  return lane.lane;
}

export const shootRight = (sim: ArchersRevengeSimulation): ArchersRevengeEvent[] => sim.dispatch({ type: 'fire', lane: rightLane(sim) });
export const shootWrong = (sim: ArchersRevengeSimulation): ArchersRevengeEvent[] => sim.dispatch({ type: 'fire', lane: wrongLane(sim) });

/** Plays the run to the end with the bot; returns every event. */
export function playToEnd(sim: ArchersRevengeSimulation, limit = 400): ArchersRevengeEvent[] {
  const events: ArchersRevengeEvent[] = [...sim.dispatch({ type: 'start' })];
  for (let i = 0; i < limit && sim.state.phase === 'playing'; i++) {
    const c = nextCommand(sim.state);
    if (!c) throw new Error(`the bot found no command at step ${i}`);
    events.push(...sim.dispatch(c));
  }
  return events;
}
