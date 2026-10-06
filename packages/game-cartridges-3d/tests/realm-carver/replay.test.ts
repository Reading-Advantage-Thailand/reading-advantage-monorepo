/** A recorded Realm Carver run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createRealmCarver, type RealmCarverEvent } from '../../src/realm-carver/core/index.js';
import { nextSteer } from '../../src/realm-carver/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: RealmCarverEvent[] = [];
    for (let step = 0; step < stepsOf(120_000) && rec.state.phase === 'playing'; step++) {
      const roll = chaos.next();
      if (step % 5 === 0 && roll < 0.8) {
        const c = nextSteer(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll > 0.97) {
        events.push(...rec.dispatch({ type: 'steer', x: chaos.next() * 2 - 1, z: chaos.next() * 2 - 1 }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'wordCarved')).toBe(true);
    const replayed = rec.replay((s) => createRealmCarver(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // A different seed gives a different campaign.
    const other = createRealmCarver(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.shift.map((r) => r.id)).not.toEqual(replayed.shift.map((r) => r.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.grid[1]![1] = 'claimed';
    expect(sim.state.grid[1]![1]).toBe('wild');
    snap.monsters[0]!.col = 99;
    expect(sim.state.monsters[0]!.col).not.toBe(99);
  });
});
