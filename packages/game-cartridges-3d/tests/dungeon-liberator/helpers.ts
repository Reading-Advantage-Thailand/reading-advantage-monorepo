/** Shared helpers of the Dungeon Liberator core tests: story fixtures, teleports, and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  ROOM,
  createDungeonLiberator,
  type DungeonLiberatorEvent,
  type DungeonLiberatorSimulation,
} from '../../src/dungeon-liberator/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): DungeonLiberatorSimulation =>
  createDungeonLiberator(story, { seed, helper });

export const tickN = (sim: DungeonLiberatorSimulation, n: number): DungeonLiberatorEvent[] => {
  const events: DungeonLiberatorEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Parks every skeleton in the far corner, still, so it cannot touch anything. */
export function parkSkeletons(sim: DungeonLiberatorSimulation): void {
  for (const s of sim.state.skeletons) {
    s.x = ROOM.maxX - 0.5;
    s.z = ROOM.maxZ - 0.5;
    s.vx = 0;
    s.vz = 0;
  }
}

/** Teleports the Knight onto a villager and ticks once. */
export function touch(sim: DungeonLiberatorSimulation, villagerId: string): DungeonLiberatorEvent[] {
  const v = sim.state.villagers.find((x) => x.id === villagerId);
  if (!v) throw new Error(`no villager ${villagerId}`);
  sim.state.knight.x = v.x;
  sim.state.knight.z = v.z;
  return sim.tick();
}

/** The villager with sentence index `index`. */
export const villagerAt = (sim: DungeonLiberatorSimulation, index: number) =>
  sim.state.villagers.find((v) => v.index === index)!;

/** Frees every villager of the room in order (skeletons parked first). */
export function freeAll(sim: DungeonLiberatorSimulation): DungeonLiberatorEvent[] {
  parkSkeletons(sim);
  const events: DungeonLiberatorEvent[] = [];
  const count = sim.state.villagers.length;
  for (let i = 0; i < count; i++) events.push(...touch(sim, villagerAt(sim, i).id));
  return events;
}

export const ofType = <T extends DungeonLiberatorEvent['type']>(events: readonly DungeonLiberatorEvent[], type: T) =>
  events.filter((e): e is Extract<DungeonLiberatorEvent, { type: T }> => e.type === type);
