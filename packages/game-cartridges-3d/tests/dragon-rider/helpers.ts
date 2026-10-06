/** Shared helpers of the Dragon Rider core tests: story fixtures, run-until, and gate choices. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import { correctGateOf, createDragonRider, type DragonRiderEvent, type DragonRiderSimulation } from '../../src/dragon-rider/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

/** 13 words (the ride caps at 8) and 5 words. */
export const STORY = loadStory('pip-is-brave');
export const SHORT_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, story: StoryInput = STORY): DragonRiderSimulation => createDragonRider(story, { seed });

export function runUntil(sim: DragonRiderSimulation, until: () => boolean, maxSteps = 6000): { events: DragonRiderEvent[]; hit: boolean } {
  const events: DragonRiderEvent[] = [];
  for (let i = 0; i < maxSteps; i++) {
    events.push(...sim.tick());
    if (until()) return { events, hit: true };
  }
  return { events, hit: false };
}

/** Ticks until a round is open with no choice (the first tick opens round 1). */
export const untilRound = (sim: DragonRiderSimulation): DragonRiderEvent[] =>
  sim.state.round && sim.state.round.chosen === null ? [] : runUntil(sim, () => sim.state.round !== null && sim.state.round.chosen === null).events;

export function chooseRight(sim: DragonRiderSimulation): DragonRiderEvent[] {
  const gate = correctGateOf(sim.state);
  if (gate === null) throw new Error('no open round');
  return sim.dispatch({ type: 'choose', gate });
}

export function chooseWrong(sim: DragonRiderSimulation): DragonRiderEvent[] {
  const right = correctGateOf(sim.state);
  if (right === null) throw new Error('no open round');
  return sim.dispatch({ type: 'choose', gate: sim.state.round!.options.findIndex((_, i) => i !== right) });
}

/** Plays the ride to the end: `pick` decides right or wrong per round; the choice comes `delaySteps` after the round opens. */
export function ride(sim: DragonRiderSimulation, pick: (roundIndex: number) => boolean = () => true, delaySteps = 0, maxSteps = stepsOf(20 * 60_000)): DragonRiderEvent[] {
  const events: DragonRiderEvent[] = [];
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
  if (sim.state.phase !== 'complete') throw new Error(`the ride did not end in ${maxSteps} steps`);
  return events;
}

export const ofType = <T extends DragonRiderEvent['type']>(events: readonly DragonRiderEvent[], type: T) =>
  events.filter((e): e is Extract<DragonRiderEvent, { type: T }> => e.type === type);
