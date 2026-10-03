/** A recorded Devourer Slime run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createDevourerSlime, type DevourerSlimeEvent } from '../../src/devourer-slime/core/index.js';
import { nextSteer } from '../../src/devourer-slime/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: DevourerSlimeEvent[] = [];
    for (let step = 0; step < stepsOf(120_000) && rec.state.phase === 'playing'; step++) {
      const roll = chaos.next();
      if (roll < 0.2) {
        const c = nextSteer(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.25) {
        events.push(...rec.dispatch({ type: 'steer', x: chaos.next() * 2 - 1, z: chaos.next() * 2 - 1 }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'wordEaten')).toBe(true);
    const replayed = rec.replay((s) => createDevourerSlime(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // A different seed gives a different shift.
    const other = createDevourerSlime(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.shift.map((s) => s.id)).not.toEqual(replayed.shift.map((s) => s.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.bubbles[0]!.x = 99;
    expect(sim.state.bubbles[0]!.x).not.toBe(99);
  });
});
