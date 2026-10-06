/** Shared helpers of the Village Guardian core tests: story fixtures, teleports, and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  GREEN,
  createVillageGuardian,
  type VillageGuardianEvent,
  type VillageGuardianSimulation,
} from '../../src/village-guardian/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): VillageGuardianSimulation =>
  createVillageGuardian(story, { seed, helper });

export const tickN = (sim: VillageGuardianSimulation, n: number): VillageGuardianEvent[] => {
  const events: VillageGuardianEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Parks every threat in the far corner, still, so it cannot touch anything. */
export function parkThreats(sim: VillageGuardianSimulation): void {
  for (const s of sim.state.threats) {
    s.x = GREEN.maxX - 0.5;
    s.z = GREEN.maxZ - 0.5;
    s.vx = 0;
    s.vz = 0;
  }
}

/** Teleports the guardian onto a villager and ticks once. */
export function touch(sim: VillageGuardianSimulation, villagerId: string): VillageGuardianEvent[] {
  const v = sim.state.villagers.find((x) => x.id === villagerId);
  if (!v) throw new Error(`no villager ${villagerId}`);
  sim.state.guardian.x = v.x;
  sim.state.guardian.z = v.z;
  return sim.tick();
}

/** The villager with sentence index `index`. */
export const villagerAt = (sim: VillageGuardianSimulation, index: number) =>
  sim.state.villagers.find((v) => v.index === index)!;

/** Calls every villager of the village in order (threats parked first). */
export function callAll(sim: VillageGuardianSimulation): VillageGuardianEvent[] {
  parkThreats(sim);
  const events: VillageGuardianEvent[] = [];
  const count = sim.state.villagers.length;
  for (let i = 0; i < count; i++) events.push(...touch(sim, villagerAt(sim, i).id));
  return events;
}

export const ofType = <T extends VillageGuardianEvent['type']>(events: readonly VillageGuardianEvent[], type: T) =>
  events.filter((e): e is Extract<VillageGuardianEvent, { type: T }> => e.type === type);
