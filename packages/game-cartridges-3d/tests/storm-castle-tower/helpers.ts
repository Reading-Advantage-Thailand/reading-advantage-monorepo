/** Shared helpers of the Storm Castle Tower core tests: story fixtures, teleports, and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createStormCastleTower,
  rightWindowsOf,
  wordKey,
  type StormCastleTowerEvent,
  type StormCastleTowerSimulation,
} from '../../src/storm-castle-tower/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): StormCastleTowerSimulation =>
  createStormCastleTower(story, { seed, helper });

export const tickN = (sim: StormCastleTowerSimulation, n: number): StormCastleTowerEvent[] => {
  const events: StormCastleTowerEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Stops the hazards: the next one falls far in the future. */
export function calm(sim: StormCastleTowerSimulation): void {
  sim.state.spawnMs = 1e12;
}

/** Puts the climber on a cell (in control) and ticks once. */
export function standOn(sim: StormCastleTowerSimulation, col: number, row: number): StormCastleTowerEvent[] {
  const c = sim.state.climber;
  c.col = col;
  c.row = row;
  c.moveMs = 0;
  c.restMs = 0;
  return sim.tick();
}

/** Opens the window of the next word. */
export function openRight(sim: StormCastleTowerSimulation): StormCastleTowerEvent[] {
  const w = rightWindowsOf(sim.state)[0]!;
  return standOn(sim, w.col, w.row);
}

/** A window of the current row that holds another word than the next one. */
export function wrongWindow(sim: StormCastleTowerSimulation) {
  const word = sim.state.shift[sim.state.tower]!.words[sim.state.next]!;
  return sim.state.windows.find((w) => wordKey(w.word) !== wordKey(word) && !w.spent)!;
}

/** Opens every window of the current tower, in order, until the top is open. */
export function buildSentence(sim: StormCastleTowerSimulation): StormCastleTowerEvent[] {
  const events: StormCastleTowerEvent[] = [];
  while (!sim.state.summitOpen) events.push(...openRight(sim));
  return events;
}

/** Builds the sentence and climbs to the top of the current tower. */
export function clearTower(sim: StormCastleTowerSimulation): StormCastleTowerEvent[] {
  const events = buildSentence(sim);
  events.push(...standOn(sim, sim.state.climber.col, sim.state.summitRow));
  return events;
}

export const ofType = <T extends StormCastleTowerEvent['type']>(events: readonly StormCastleTowerEvent[], type: T) =>
  events.filter((e): e is Extract<StormCastleTowerEvent, { type: T }> => e.type === type);
