/** Shared helpers of the Enchanted Library core tests: story fixtures and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createEnchantedLibrary,
  targetBookOf,
  type Book,
  type EnchantedLibrarySimulation,
  type LibraryEvent,
} from '../../src/enchanted-library/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const SMALL_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): EnchantedLibrarySimulation =>
  createEnchantedLibrary(story, { seed, helper });

export const tickN = (sim: EnchantedLibrarySimulation, n: number): LibraryEvent[] => {
  const events: LibraryEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Puts the hero on a book (a touch on the next tick) and ticks once. */
export function touch(sim: EnchantedLibrarySimulation, book: Book): LibraryEvent[] {
  sim.state.hero.x = book.x;
  sim.state.hero.z = book.z;
  sim.state.hero.controlMs = 0;
  return sim.tick();
}

/** Clears the current round by touching its right book. */
export const clearRound = (sim: EnchantedLibrarySimulation): LibraryEvent[] => touch(sim, targetBookOf(sim.state)!);

/** A wrong book of the current round that is not spent. */
export const wrongBook = (sim: EnchantedLibrarySimulation): Book => sim.state.books.find((b) => !b.correct && !b.spent)!;

export const ofType = <T extends LibraryEvent['type']>(events: readonly LibraryEvent[], type: T) =>
  events.filter((e): e is Extract<LibraryEvent, { type: T }> => e.type === type);
