/** A recorded Hero vs. Zombie run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createHeroVsZombie, type HeroVsZombieEvent } from '../../src/hero-vs-zombie/core/index.js';
import { nextCommand } from '../../src/hero-vs-zombie/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: HeroVsZombieEvent[] = [];
    for (let step = 0; step < stepsOf(120_000) && rec.state.phase !== 'complete'; step++) {
      const roll = chaos.next();
      if (roll < 0.2) {
        const c = nextCommand(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.25) {
        events.push(...rec.dispatch({ type: 'steer', x: chaos.next() * 2 - 1, z: chaos.next() * 2 - 1 }));
      } else if (roll < 0.26) {
        events.push(...rec.dispatch({ type: 'blast' }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'orbTaken')).toBe(true);
    expect(events.some((e) => e.type === 'blast')).toBe(true);
    const replayed = rec.replay((s) => createHeroVsZombie(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // A different seed gives a different night.
    const other = createHeroVsZombie(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.words.map((w) => w.id)).not.toEqual(replayed.words.map((w) => w.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.zombies[0]!.x = 99;
    expect(sim.state.zombies[0]!.x).not.toBe(99);
  });
});
