/** The QC bot plays a whole night within a step limit, on the state alone, steering every 150 ms. */
import { describe, expect, it } from 'vitest';
import { createRecorder } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createHeroVsZombie, type HeroVsZombieEvent } from '../../src/hero-vs-zombie/core/index.js';
import { nextCommand } from '../../src/hero-vs-zombie/qc/bot.js';
import { SHORT_STORY, STORY, ofType, stepsOf } from './helpers.js';

const LIMIT_STEPS = stepsOf(8 * 60_000);
/** The bot acts every 5 steps (about every 150 ms), as the QC driver does. */
const ACT_EVERY = 5;

describe('bot', () => {
  it.each(
    [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) =>
      (['pip-is-brave', 'the-school-garden'] as const).map((story) => [seed, seed % 2 === 0, story] as const),
    ),
  )('seed %i helper %s plays %s to the end', { timeout: 30_000 }, (seed, helper, inputId) => {
    const story = inputId === 'pip-is-brave' ? STORY : SHORT_STORY;
    const sim = createRecorder(seed, createHeroVsZombie(story, { seed, helper }));
    const events: HeroVsZombieEvent[] = [];
    let steps = 0;
    while (sim.state.phase !== 'complete' && steps < LIMIT_STEPS) {
      if (steps % ACT_EVERY === 0) {
        const c = nextCommand(sim.state);
        if (c) events.push(...sim.dispatch(c));
      }
      events.push(...sim.tick());
      steps += 1;
    }
    expect(sim.state.phase).toBe('complete');
    expect(steps).toBeLessThan(LIMIT_STEPS);
    expect(ofType(events, 'nightComplete')).toHaveLength(1);
    expect(sim.state.words.every((w) => w.solved)).toBe(true);
    // The bot reads: at most a brush past a wrong orb now and then.
    expect(ofType(events, 'orbWrong').length).toBeLessThanOrEqual(2);
    expect(sim.state.rounds).toBe(sim.state.total);
  });

  it('returns null outside the night, steers to the right orb, and blasts a close pair', () => {
    const sim = createHeroVsZombie(STORY, { seed: 1, helper: false });
    const c = nextCommand(sim.state)!;
    expect(c.type).toBe('steer');
    if (c.type === 'steer') expect(Math.hypot(c.x, c.z)).toBeCloseTo(1);
    // Two walking zombies within 3 m and a charge: blast.
    for (const z of sim.state.zombies.slice(0, 2)) {
      z.rising = false;
      z.riseMs = 0;
      z.x = sim.state.hero.x + 1;
      z.z = sim.state.hero.z;
    }
    expect(nextCommand(sim.state)).toEqual({ type: 'blast' });
    sim.state.charges = 0;
    expect(nextCommand(sim.state)!.type).toBe('steer');
    // Down zombies do not count.
    sim.state.charges = 1;
    sim.state.zombies[0]!.downMs = 1000;
    expect(nextCommand(sim.state)!.type).toBe('steer');
    sim.state.hero.bumpedMs = 100;
    expect(nextCommand(sim.state)).toBeNull();
    expect(nextCommand(createHeroVsZombie([], { seed: 1, helper: false }).state)).toBeNull();
  });
});
