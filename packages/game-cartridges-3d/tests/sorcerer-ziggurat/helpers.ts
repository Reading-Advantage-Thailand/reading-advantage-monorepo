/** Shared helpers of the Sorcerer's Ziggurat core tests: story fixtures and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import {
  correctCubeOf,
  createSorcererZiggurat,
  type Cube,
  type ZigguratEvent,
  type ZigguratSimulation,
} from '../../src/sorcerer-ziggurat/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const create = (seed = 7, helper = false, story: StoryInput = STORY): ZigguratSimulation =>
  createSorcererZiggurat(story, { seed, helper });

/** Steps onto the right cube of the tier on offer. */
export const climb = (sim: ZigguratSimulation): ZigguratEvent[] => sim.dispatch({ type: 'step', cubeId: correctCubeOf(sim.state)!.id });

/** A wrong cube of the tier on offer that has not crumbled. */
export const wrongCube = (sim: ZigguratSimulation): Cube => sim.state.cubes.find((c) => !c.correct && !c.spent)!;

export const ofType = <T extends ZigguratEvent['type']>(events: readonly ZigguratEvent[], type: T) =>
  events.filter((e): e is Extract<ZigguratEvent, { type: T }> => e.type === type);
