/** Shared helpers of the Realm Carver core tests: story fixtures, moves, and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  DIR_STEP,
  createRealmCarver,
  type Dir,
  type RealmCarverEvent,
  type RealmCarverSimulation,
} from '../../src/realm-carver/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): RealmCarverSimulation =>
  createRealmCarver(story, { seed, helper });

export const tickN = (sim: RealmCarverSimulation, n: number): RealmCarverEvent[] => {
  const events: RealmCarverEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Parks every monster in the top left corner cell, still, so it cannot touch the trail. */
export function parkMonsters(sim: RealmCarverSimulation): void {
  for (const m of sim.state.monsters) {
    m.col = 1;
    m.row = 1;
    m.waitMs = 1e9;
  }
}

/** Presses `dir` until the carver has moved one cell, then stops it. */
export function stepCarver(sim: RealmCarverSimulation, dir: Dir): RealmCarverEvent[] {
  const events: RealmCarverEvent[] = [];
  sim.dispatch({ type: 'steer', x: DIR_STEP[dir].dc, z: DIR_STEP[dir].dr });
  const before = { col: sim.state.carver.col, row: sim.state.carver.row };
  for (let i = 0; i < 20; i++) {
    events.push(...sim.tick());
    const c = sim.state.carver;
    if (c.col !== before.col || c.row !== before.row) break;
  }
  sim.dispatch({ type: 'steer', x: 0, z: 0 });
  return events;
}

/** Walks the carver along `dirs`, one cell each. */
export function walkPath(sim: RealmCarverSimulation, dirs: readonly Dir[]): RealmCarverEvent[] {
  const events: RealmCarverEvent[] = [];
  for (const d of dirs) events.push(...stepCarver(sim, d));
  return events;
}

export const repeat = (dir: Dir, n: number): Dir[] => Array<Dir>(n).fill(dir);

export const ofType = <T extends RealmCarverEvent['type']>(events: readonly RealmCarverEvent[], type: T) =>
  events.filter((e): e is Extract<RealmCarverEvent, { type: T }> => e.type === type);
