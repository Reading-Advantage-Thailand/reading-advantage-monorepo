/** Shared helpers of the Labyrinth core tests: story fixtures, teleports, and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createLabyrinth,
  exitsOf,
  neighborOf,
  oppositeOf,
  rightOrbOf,
  type Cell,
  type LabyrinthEvent,
  type LabyrinthSimulation,
} from '../../src/labyrinth/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

/** A shift on maze 1 unless `maze` says otherwise (the rules tests know its corridors). */
export const create = (seed = 7, helper = false, story: StoryInput = STORY, maze: string | null = 'labyrinth-1'): LabyrinthSimulation =>
  createLabyrinth(story, maze ? { seed, helper, maze } : { seed, helper });

export const tickN = (sim: LabyrinthSimulation, n: number): LabyrinthEvent[] => {
  const events: LabyrinthEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Keeps every goblin in its den, resting, so it cannot touch anything. */
export function parkGoblins(sim: LabyrinthSimulation): void {
  for (const g of sim.state.goblins) {
    g.cell = { ...g.den };
    g.next = null;
    g.progress = 0;
    g.returning = false;
    g.restMs = 1e9;
  }
}

/** Puts the hero one step short of `cell`, walking onto it with a stop, and ticks once (the arrival). */
export function stepOnto(sim: LabyrinthSimulation, cell: Cell): LabyrinthEvent[] {
  const h = sim.state.hero;
  const dir = exitsOf(sim.state.maze, cell)[0];
  if (!dir) throw new Error(`cell (${cell.col}, ${cell.row}) has no exit`);
  h.cell = neighborOf(cell, dir);
  h.next = { ...cell };
  h.progress = 0.95;
  h.dir = oppositeOf(dir);
  h.queued = null;
  h.stopping = true;
  return sim.tick();
}

/** Takes the right orb of the current word (goblins parked first). */
export function takeRight(sim: LabyrinthSimulation): LabyrinthEvent[] {
  parkGoblins(sim);
  const orb = rightOrbOf(sim.state);
  if (!orb) throw new Error('no right orb');
  return stepOnto(sim, orb.cell);
}

/** Takes every word of the current sentence in order. */
export function buildSentence(sim: LabyrinthSimulation): LabyrinthEvent[] {
  const events: LabyrinthEvent[] = [];
  const count = sim.state.shift[sim.state.sentence]!.words.length - sim.state.next;
  for (let i = 0; i < count; i++) events.push(...takeRight(sim));
  return events;
}

export const ofType = <T extends LabyrinthEvent['type']>(events: readonly LabyrinthEvent[], type: T) =>
  events.filter((e): e is Extract<LabyrinthEvent, { type: T }> => e.type === type);
