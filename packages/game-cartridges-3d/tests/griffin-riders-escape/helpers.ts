/** Shared helpers of the Griffin Riders Escape core tests: story fixtures, run-until, and flights. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createGriffinRidersEscape,
  type EscapeEvent,
  type EscapeSimulation,
} from '../../src/griffin-riders-escape/core/index.js';
import { nextChoice } from '../../src/griffin-riders-escape/qc/bot.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

/** 12 sentences (the escape caps at 4) and 6 longer sentences. */
export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): EscapeSimulation =>
  createGriffinRidersEscape(story, { seed, helper });

export const tickN = (sim: EscapeSimulation, n: number): EscapeEvent[] => {
  const events: EscapeEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Ticks until `until` returns true (checked on each tick's events) or `maxSteps` pass; returns all events. */
export function runUntil(sim: EscapeSimulation, until: (now: EscapeEvent[]) => boolean, maxSteps = 6000): { events: EscapeEvent[]; hit: boolean } {
  const events: EscapeEvent[] = [];
  for (let steps = 1; steps <= maxSteps; steps++) {
    const now = sim.tick();
    events.push(...now);
    if (until(now)) return { events, hit: true };
  }
  return { events, hit: false };
}

/** The lane a gate row's wrong choice would be (the first lane that is not the right one). */
export const wrongLane = (rightLane: number, lanes = 3): number => [...Array(lanes).keys()].find((l) => l !== rightLane)!;

/**
 * Flies the escape to the end with the bot, except that `pick(wave)` may return a lane for a gate
 * row (to fly wrong on purpose) or `null` for the bot's choice; `noDodge` flies into every storm.
 */
export function fly(
  sim: EscapeSimulation,
  opts: { wrongOn?: (waveNumber: number) => boolean; noDodge?: boolean; maxSteps?: number } = {},
): EscapeEvent[] {
  const events: EscapeEvent[] = [];
  const maxSteps = opts.maxSteps ?? stepsOf(30 * 60_000);
  let steps = 0;
  while (sim.state.phase !== 'complete' && steps < maxSteps) {
    const wave = sim.state.waves[0];
    if (wave && wave.kind === 'gates' && opts.wrongOn?.(Number(wave.id.slice(1)))) {
      events.push(...sim.dispatch({ type: 'lane', lane: wrongLane(wave.rightLane) }));
    } else if (wave && wave.kind === 'storm' && opts.noDodge) {
      events.push(...sim.dispatch({ type: 'lane', lane: wave.stormLanes[0]! }));
    } else {
      const c = nextChoice(sim.state);
      if (c) events.push(...sim.dispatch(c));
    }
    events.push(...sim.tick());
    steps += 1;
  }
  if (sim.state.phase !== 'complete') throw new Error(`the escape did not end in ${maxSteps} steps`);
  return events;
}

export const ofType = <T extends EscapeEvent['type']>(events: readonly EscapeEvent[], type: T) =>
  events.filter((e): e is Extract<EscapeEvent, { type: T }> => e.type === type);
