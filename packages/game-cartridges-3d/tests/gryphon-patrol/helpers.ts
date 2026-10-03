/** Shared helpers of the Gryphon Patrol core tests: story fixtures, run-until, and shots. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  createGryphonPatrol,
  rightEnemyOf,
  type PatrolEvent,
  type PatrolSimulation,
} from '../../src/gryphon-patrol/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

/** 12 sentences (the patrol caps at 4) and 6 longer sentences. */
export const STORY = loadStory('pip-is-brave');
export const LONG_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): PatrolSimulation =>
  createGryphonPatrol(story, { seed, helper });

/** Ticks until `until` returns true (checked on each tick's events) or `maxSteps` pass; returns all events. */
export function runUntil(
  sim: PatrolSimulation,
  until: (now: PatrolEvent[]) => boolean,
  maxSteps = 6000,
): { events: PatrolEvent[]; steps: number; hit: boolean } {
  const events: PatrolEvent[] = [];
  for (let steps = 1; steps <= maxSteps; steps++) {
    const now = sim.tick();
    events.push(...now);
    if (until(now)) return { events, steps, hit: true };
  }
  return { events, steps: maxSteps, hit: false };
}

export const tickN = (sim: PatrolSimulation, n: number): PatrolEvent[] => {
  const events: PatrolEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** True while a round is open for a shot (no shot in flight, no rest). */
export const aiming = (sim: PatrolSimulation): boolean =>
  sim.state.phase === 'patrol' && sim.state.round !== null && sim.state.round.stage === 'aim' && sim.state.restMs === 0;

/** Ticks until a round is open for a shot (the first tick opens round 1). */
export function untilRound(sim: PatrolSimulation, maxSteps = 6000): PatrolEvent[] {
  if (aiming(sim)) return [];
  return runUntil(sim, () => aiming(sim), maxSteps).events;
}

/** Shoots the bat with the next word. */
export function shootRight(sim: PatrolSimulation): PatrolEvent[] {
  const enemy = rightEnemyOf(sim.state);
  if (!enemy) throw new Error('no open round');
  return sim.dispatch({ type: 'shoot', enemy: enemy.id });
}

/** Shoots a bat that does not carry the next word (the first one). */
export function shootWrong(sim: PatrolSimulation): PatrolEvent[] {
  const round = sim.state.round;
  if (!round || round.stage !== 'aim') throw new Error('no open round');
  const enemy = round.enemies.find((e) => !e.right && e.alive);
  if (!enemy) throw new Error('no wrong bat');
  return sim.dispatch({ type: 'shoot', enemy: enemy.id });
}

/**
 * Plays the patrol to the end: `pick` decides right or wrong per round (by rounds so far), the
 * shot comes `delaySteps` after the round opens. Returns every event.
 */
export function run(
  sim: PatrolSimulation,
  pick: (roundNumber: number) => boolean = () => true,
  delaySteps = 0,
  maxSteps = stepsOf(30 * 60_000),
): PatrolEvent[] {
  const events: PatrolEvent[] = [];
  let steps = 0;
  let openedAt = -1;
  while (sim.state.phase !== 'complete' && steps < maxSteps) {
    if (aiming(sim)) {
      if (openedAt === -1) openedAt = steps;
      if (steps - openedAt >= delaySteps) {
        events.push(...(pick(sim.state.rounds) ? shootRight(sim) : shootWrong(sim)));
        openedAt = -1;
      }
    }
    events.push(...sim.tick());
    steps += 1;
  }
  if (sim.state.phase !== 'complete') throw new Error(`the patrol did not end in ${maxSteps} steps`);
  return events;
}

export const ofType = <T extends PatrolEvent['type']>(events: readonly PatrolEvent[], type: T) =>
  events.filter((e): e is Extract<PatrolEvent, { type: T }> => e.type === type);
