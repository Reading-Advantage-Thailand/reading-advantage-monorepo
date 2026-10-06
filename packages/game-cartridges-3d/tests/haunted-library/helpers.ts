/** Shared helpers of the Haunted Library core tests: story fixtures, teleports, and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createHauntedLibrary,
  nextDoorOf,
  type Door,
  type HauntedLibrarySimulation,
  type LibraryEvent,
} from '../../src/haunted-library/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): HauntedLibrarySimulation =>
  createHauntedLibrary(story, { seed, helper });

export const tickN = (sim: HauntedLibrarySimulation, n: number): LibraryEvent[] => {
  const events: LibraryEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Parks every hazard on the top floor's far end, still, so it cannot touch anything. */
export function parkHazards(sim: HauntedLibrarySimulation): void {
  for (const z of sim.state.hazards) {
    z.x = 5;
    z.floor = 3;
    z.vx = 0;
    z.stunMs = 1e9;
  }
}

/** Puts the hero on a door's floor, next to the door. */
export function standAt(sim: HauntedLibrarySimulation, door: Door, offset = 0): void {
  const h = sim.state.hero;
  h.floor = door.floor;
  h.toFloor = door.floor;
  h.travelMs = 0;
  h.controlMs = 0;
  h.x = door.x + offset;
}

/** The door of word `index`. */
export const doorAt = (sim: HauntedLibrarySimulation, index: number): Door => sim.state.doors.find((d) => d.index === index)!;

/** Opens the next door of the room (hazards parked first). */
export function openNext(sim: HauntedLibrarySimulation): LibraryEvent[] {
  const door = nextDoorOf(sim.state)!;
  standAt(sim, door);
  return sim.dispatch({ type: 'open' });
}

export const ofType = <T extends LibraryEvent['type']>(events: readonly LibraryEvent[], type: T) =>
  events.filter((e): e is Extract<LibraryEvent, { type: T }> => e.type === type);
