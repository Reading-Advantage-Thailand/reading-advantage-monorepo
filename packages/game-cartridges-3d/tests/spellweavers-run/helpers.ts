/** Shared helpers of the Spellweaver's Run core tests: story fixtures, run-until, and lane choices. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  correctLaneOf,
  createSpellweaversRun,
  type SpellweaversEvent,
  type SpellweaversSimulation,
} from '../../src/spellweavers-run/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

/** 12 sentences (the run caps at 5) and 6 longer sentences. */
export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): SpellweaversSimulation =>
  createSpellweaversRun(story, { seed, helper });

/** Ticks until `until` returns true (checked on each tick's events) or `maxSteps` pass; returns all events. */
export function runUntil(
  sim: SpellweaversSimulation,
  until: (now: SpellweaversEvent[]) => boolean,
  maxSteps = 6000,
): { events: SpellweaversEvent[]; steps: number; hit: boolean } {
  const events: SpellweaversEvent[] = [];
  for (let steps = 1; steps <= maxSteps; steps++) {
    const now = sim.tick();
    events.push(...now);
    if (until(now)) return { events, steps, hit: true };
  }
  return { events, steps: maxSteps, hit: false };
}

export const tickN = (sim: SpellweaversSimulation, n: number): SpellweaversEvent[] => {
  const events: SpellweaversEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Ticks until a round is open with no choice (the first tick opens round 1). */
export function untilRound(sim: SpellweaversSimulation, maxSteps = 6000): SpellweaversEvent[] {
  if (sim.state.round && sim.state.round.chosen === null && sim.state.restMs === 0) return [];
  return runUntil(sim, () => sim.state.round !== null && sim.state.round.chosen === null && sim.state.restMs === 0, maxSteps).events;
}

/** Chooses the right lane of the open round. */
export function chooseRight(sim: SpellweaversSimulation): SpellweaversEvent[] {
  const lane = correctLaneOf(sim.state);
  if (lane === null) throw new Error('no open round');
  return sim.dispatch({ type: 'choose', lane });
}

/** Chooses a wrong lane of the open round (the first one that is not right). */
export function chooseWrong(sim: SpellweaversSimulation): SpellweaversEvent[] {
  const right = correctLaneOf(sim.state);
  if (right === null) throw new Error('no open round');
  const lane = sim.state.round!.options.findIndex((_, i) => i !== right);
  return sim.dispatch({ type: 'choose', lane });
}

/**
 * Plays the run to the end: `pick` decides right or wrong per round (by round count so far), the
 * choice comes `delaySteps` after the round opens. Returns every event.
 */
export function run(
  sim: SpellweaversSimulation,
  pick: (roundNumber: number) => boolean = () => true,
  delaySteps = 0,
  maxSteps = stepsOf(30 * 60_000),
): SpellweaversEvent[] {
  const events: SpellweaversEvent[] = [];
  let steps = 0;
  let openedAt = -1;
  while (sim.state.phase !== 'complete' && steps < maxSteps) {
    const round = sim.state.round;
    if (sim.state.phase === 'running' && round && round.chosen === null && sim.state.restMs === 0) {
      if (openedAt === -1) openedAt = steps;
      if (steps - openedAt >= delaySteps) {
        events.push(...(pick(sim.state.rounds) ? chooseRight(sim) : chooseWrong(sim)));
        openedAt = -1;
      }
    }
    events.push(...sim.tick());
    steps += 1;
  }
  if (sim.state.phase !== 'complete') throw new Error(`the run did not end in ${maxSteps} steps`);
  return events;
}

export const ofType = <T extends SpellweaversEvent['type']>(events: readonly SpellweaversEvent[], type: T) =>
  events.filter((e): e is Extract<SpellweaversEvent, { type: T }> => e.type === type);
