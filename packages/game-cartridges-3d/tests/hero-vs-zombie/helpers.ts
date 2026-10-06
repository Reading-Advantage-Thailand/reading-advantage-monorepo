/** Shared helpers of the Hero vs. Zombie core tests: story fixtures, teleports, and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  YARD,
  correctOrbOf,
  createHeroVsZombie,
  type HeroVsZombieEvent,
  type HeroVsZombieSimulation,
} from '../../src/hero-vs-zombie/core/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');

export const loadStory = (id: string): StoryInput =>
  parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);

/** 13 words (the night caps at 10) and 5 words. */
export const STORY = loadStory('pip-is-brave');
export const SHORT_STORY = loadStory('the-school-garden');

export const stepsOf = (ms: number): number => Math.ceil(ms / STEP_MS);

export const create = (seed = 7, helper = false, story: StoryInput = STORY): HeroVsZombieSimulation =>
  createHeroVsZombie(story, { seed, helper });

export const tickN = (sim: HeroVsZombieSimulation, n: number): HeroVsZombieEvent[] => {
  const events: HeroVsZombieEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.tick());
  return events;
};

/** Parks every zombie in the far corner, up and still, so it cannot reach the hero soon. */
export function parkZombies(sim: HeroVsZombieSimulation): void {
  for (const z of sim.state.zombies) {
    z.x = YARD.maxX - 0.5;
    z.z = YARD.maxZ - 0.5;
    z.rising = false;
    z.riseMs = 0;
    z.attackMs = 0;
  }
}

/** Teleports the hero onto an orb and ticks once (zombies parked first). */
export function touch(sim: HeroVsZombieSimulation, orbId: string): HeroVsZombieEvent[] {
  const orb = sim.state.orbs.find((o) => o.id === orbId);
  if (!orb) throw new Error(`no orb ${orbId}`);
  parkZombies(sim);
  sim.state.hero.x = orb.x;
  sim.state.hero.z = orb.z;
  return sim.tick();
}

/** Takes the right orb of the round. */
export function takeRight(sim: HeroVsZombieSimulation): HeroVsZombieEvent[] {
  const orb = correctOrbOf(sim.state);
  if (!orb) throw new Error('no round');
  return touch(sim, orb.id);
}

/** Takes a wrong orb of the round (the first one that is not right). */
export function takeWrong(sim: HeroVsZombieSimulation): HeroVsZombieEvent[] {
  const orb = sim.state.orbs.find((o) => !o.correct);
  if (!orb) throw new Error('no wrong orb');
  return touch(sim, orb.id);
}

/**
 * Plays the night to the end by teleports: `pick` decides right or wrong per touch (by round
 * index and the round word's attempts so far); the dawn runs out after. Returns every event.
 */
export function playNight(
  sim: HeroVsZombieSimulation,
  pick: (roundIndex: number, attempts: number) => boolean = () => true,
  maxTouches = 60,
): HeroVsZombieEvent[] {
  const events: HeroVsZombieEvent[] = [];
  let guard = 0;
  while (sim.state.phase === 'night' && guard < maxTouches) {
    const word = sim.state.words.find((w) => w.id === sim.state.round!.itemId)!;
    events.push(...(pick(sim.state.roundIndex, word.attempts) ? takeRight(sim) : takeWrong(sim)));
    guard += 1;
  }
  if (sim.state.phase === 'night') throw new Error(`the night did not end in ${maxTouches} touches`);
  while (sim.state.phase !== 'complete') events.push(...sim.tick());
  return events;
}

export const ofType = <T extends HeroVsZombieEvent['type']>(events: readonly HeroVsZombieEvent[], type: T) =>
  events.filter((e): e is Extract<HeroVsZombieEvent, { type: T }> => e.type === type);
