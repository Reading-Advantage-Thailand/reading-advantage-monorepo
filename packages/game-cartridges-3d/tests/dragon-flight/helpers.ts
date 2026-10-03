/** Shared helpers of the Dragon Flight core tests: story fixtures, run-until, and gate choices. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  correctGateOf,
  createDragonFlight,
  type DragonFlightEvent,
  type DragonFlightSimulation,
} from '../../src/dragon-flight/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

/** 13 words (the flight caps at 10) and 5 words. */
export const STORY = loadStory('pip-is-brave');
export const SHORT_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): DragonFlightSimulation =>
  createDragonFlight(story, { seed, helper });

/** Ticks until `until` returns true (checked on each tick's events) or `maxSteps` pass; returns all events. */
export function runUntil(
  sim: DragonFlightSimulation,
  until: (now: DragonFlightEvent[]) => boolean,
  maxSteps = 6000,
): { events: DragonFlightEvent[]; steps: number; hit: boolean } {
  const events: DragonFlightEvent[] = [];
  for (let steps = 1; steps <= maxSteps; steps++) {
    const now = sim.tick();
    events.push(...now);
    if (until(now)) return { events, steps, hit: true };
  }
  return { events, steps: maxSteps, hit: false };
}

export const tickN = (sim: DragonFlightSimulation, n: number): DragonFlightEvent[] => {
  const events: DragonFlightEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Ticks until a round is open with no choice (the first tick opens round 1). */
export function untilRound(sim: DragonFlightSimulation, maxSteps = 6000): DragonFlightEvent[] {
  if (sim.state.round && sim.state.round.chosen === null) return [];
  return runUntil(sim, () => sim.state.round !== null && sim.state.round.chosen === null, maxSteps).events;
}

/** Chooses the right gate of the open round. */
export function chooseRight(sim: DragonFlightSimulation): DragonFlightEvent[] {
  const gate = correctGateOf(sim.state);
  if (gate === null) throw new Error('no open round');
  return sim.dispatch({ type: 'choose', gate });
}

/** Chooses a wrong gate of the open round (the first one that is not right). */
export function chooseWrong(sim: DragonFlightSimulation): DragonFlightEvent[] {
  const right = correctGateOf(sim.state);
  if (right === null) throw new Error('no open round');
  const gate = sim.state.round!.options.findIndex((_, i) => i !== right);
  return sim.dispatch({ type: 'choose', gate });
}

/**
 * Plays the flight to the end: `pick` decides right or wrong per round (by round index), the
 * choice comes `delaySteps` after the round starts. Returns every event.
 */
export function fly(
  sim: DragonFlightSimulation,
  pick: (roundIndex: number) => boolean = () => true,
  delaySteps = 0,
  maxSteps = stepsOf(20 * 60_000),
): DragonFlightEvent[] {
  const events: DragonFlightEvent[] = [];
  let steps = 0;
  let openedAt = -1;
  while (sim.state.phase !== 'complete' && steps < maxSteps) {
    const round = sim.state.round;
    if (round && round.chosen === null) {
      if (openedAt === -1) openedAt = steps;
      if (steps - openedAt >= delaySteps) {
        events.push(...(pick(sim.state.roundIndex) ? chooseRight(sim) : chooseWrong(sim)));
        openedAt = -1;
      }
    }
    events.push(...sim.tick());
    steps += 1;
  }
  if (sim.state.phase !== 'complete') throw new Error(`the flight did not end in ${maxSteps} steps`);
  return events;
}

export const ofType = <T extends DragonFlightEvent['type']>(events: readonly DragonFlightEvent[], type: T) =>
  events.filter((e): e is Extract<DragonFlightEvent, { type: T }> => e.type === type);
