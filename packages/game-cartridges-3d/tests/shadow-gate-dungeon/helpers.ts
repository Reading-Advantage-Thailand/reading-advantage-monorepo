/** Shared helpers of the Shadow Gate Dungeon core tests: story fixtures, teleports, and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  ROOM,
  createShadowGate,
  rightCrystalsOf,
  wordKey,
  type ShadowGateEvent,
  type ShadowGateSimulation,
} from '../../src/shadow-gate-dungeon/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): ShadowGateSimulation =>
  createShadowGate(story, { seed, helper });

export const tickN = (sim: ShadowGateSimulation, n: number): ShadowGateEvent[] => {
  const events: ShadowGateEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Parks every shadow in the far corner, resting, so it cannot touch or chase anything. */
export function parkShadows(sim: ShadowGateSimulation): void {
  for (const s of sim.state.shadows) {
    s.x = ROOM.maxX - 0.5;
    s.z = ROOM.maxZ - 0.5;
    s.restMs = 1e9;
  }
}

/** Teleports the hero onto a crystal and ticks once. */
export function touch(sim: ShadowGateSimulation, crystalId: string): ShadowGateEvent[] {
  const c = sim.state.crystals.find((x) => x.id === crystalId);
  if (!c) throw new Error(`no crystal ${crystalId}`);
  sim.state.hero.x = c.x;
  sim.state.hero.z = c.z;
  return sim.tick();
}

/** The first crystal that holds the next word. */
export const rightCrystal = (sim: ShadowGateSimulation) => rightCrystalsOf(sim.state)[0]!;

/** A crystal that holds another word than the next one. */
export const wrongCrystal = (sim: ShadowGateSimulation) => {
  const word = sim.state.shift[sim.state.room]!.words[sim.state.next]!;
  return sim.state.crystals.find((c) => wordKey(c.word) !== wordKey(word))!;
};

/** Takes every word of the room in order (shadows parked first). */
export function buildSentence(sim: ShadowGateSimulation): ShadowGateEvent[] {
  parkShadows(sim);
  const events: ShadowGateEvent[] = [];
  const count = sim.state.shift[sim.state.room]!.words.length;
  for (let i = 0; i < count; i++) events.push(...touch(sim, rightCrystal(sim).id));
  return events;
}

export const ofType = <T extends ShadowGateEvent['type']>(events: readonly ShadowGateEvent[], type: T) =>
  events.filter((e): e is Extract<ShadowGateEvent, { type: T }> => e.type === type);
