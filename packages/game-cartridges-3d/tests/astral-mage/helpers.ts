/** Shared helpers of the Astral Mage core tests: story fixtures and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createAstralMage,
  nextCrystalOf,
  type AstralMageEvent,
  type AstralMageSimulation,
} from '../../src/astral-mage/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): AstralMageSimulation =>
  createAstralMage(story, { seed, helper });

export const tickN = (sim: AstralMageSimulation, n: number): AstralMageEvent[] => {
  const events: AstralMageEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Ticks until no bolt is in flight (a bolt arrives within a few seconds). */
export function settle(sim: AstralMageSimulation, limit = 200): AstralMageEvent[] {
  const events: AstralMageEvent[] = [];
  for (let i = 0; i < limit && sim.state.bolt !== null; i++) events.push(...sim.tick());
  return events;
}

/** Casts at a crystal and ticks until the bolt resolves; returns the dispatch and tick events. */
export function shoot(sim: AstralMageSimulation, crystalId?: string): AstralMageEvent[] {
  const events = [...sim.dispatch({ type: 'cast', ...(crystalId ? { crystalId } : {}) })];
  events.push(...settle(sim));
  return events;
}

/** Strikes every word of the current ritual in order. */
export function castAll(sim: AstralMageSimulation): AstralMageEvent[] {
  const events: AstralMageEvent[] = [];
  const ritual = sim.state.ritual;
  while (sim.state.phase === 'playing' && sim.state.ritual === ritual) {
    const next = nextCrystalOf(sim.state);
    if (!next) break;
    events.push(...shoot(sim, next.id));
  }
  return events;
}

export const ofType = <T extends AstralMageEvent['type']>(events: readonly AstralMageEvent[], type: T) =>
  events.filter((e): e is Extract<AstralMageEvent, { type: T }> => e.type === type);
